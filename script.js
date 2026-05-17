// OpenWeatherMap API key (free tier)
const API_KEY = '8d4fdb0571e6c6bf55fc2bf53db8a1a9';
const API_BASE = 'https://api.openweathermap.org';

let currentCity = 'London';

// Initialize on page load
window.addEventListener('load', () => {
    searchWeather();
});

// Allow Enter key to search
document.getElementById('cityInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchWeather();
    }
});

async function searchWeather() {
    const cityInput = document.getElementById('cityInput').value.trim();
    if (cityInput) {
        currentCity = cityInput;
    }

    showLoading(true);
    hideError();

    try {
        const weatherData = await fetchWeatherData(currentCity);
        const forecastData = await fetchForecastData(weatherData.coord.lat, weatherData.coord.lon);
        
        displayCurrentWeather(weatherData);
        displayForecast(forecastData);
        document.getElementById('cityInput').value = '';
    } catch (error) {
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

async function fetchWeatherData(city) {
    const response = await fetch(
        `${API_BASE}/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`
    );

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('City not found. Please try another search.');
        }
        throw new Error('Failed to fetch weather data.');
    }

    return await response.json();
}

async function fetchForecastData(lat, lon) {
    const response = await fetch(
        `${API_BASE}/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
    );

    if (!response.ok) {
        throw new Error('Failed to fetch forecast data.');
    }

    return await response.json();
}

function displayCurrentWeather(data) {
    const weather = data.weather[0];
    const main = data.main;
    const wind = data.wind;
    const sys = data.sys;
    const clouds = data.clouds;

    // Update city info
    document.getElementById('cityName').textContent = `${data.name}, ${data.sys.country}`;
    document.getElementById('weatherDescription').textContent = 
        weather.main + ' - ' + weather.description.charAt(0).toUpperCase() + weather.description.slice(1);

    // Update temperature
    document.getElementById('temperature').textContent = Math.round(main.temp);

    // Update weather icon
    const iconUrl = `https://openweathermap.org/img/wn/${weather.icon}@4x.png`;
    document.getElementById('weatherIcon').src = iconUrl;

    // Update details
    document.getElementById('feelsLike').textContent = Math.round(main.feels_like) + '°C';
    document.getElementById('humidity').textContent = main.humidity + '%';
    document.getElementById('windSpeed').textContent = wind.speed.toFixed(1) + ' m/s';
    document.getElementById('pressure').textContent = main.pressure + ' hPa';
    document.getElementById('visibility').textContent = (data.visibility / 1000).toFixed(1) + ' km';
    document.getElementById('uvIndex').textContent = '--'; // UV index requires separate API call

    // Make weather container visible
    document.getElementById('weatherContainer').classList.remove('hidden');
}

function displayForecast(data) {
    const forecastList = document.getElementById('forecastList');
    forecastList.innerHTML = '';

    // Get one forecast per day (every 24 hours)
    const dailyForecasts = {};
    
    data.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dateKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        // Keep only one forecast per day (the first one we encounter)
        if (!dailyForecasts[dateKey]) {
            dailyForecasts[dateKey] = item;
        }
    });

    // Display next 5 days
    Object.entries(dailyForecasts).slice(1, 6).forEach(([dateKey, item]) => {
        const weather = item.weather[0];
        const temp = item.main.temp;
        
        const forecastItem = document.createElement('div');
        forecastItem.className = 'forecast-item';
        forecastItem.innerHTML = `
            <div class="date">${dateKey}</div>
            <img src="https://openweathermap.org/img/wn/${weather.icon}@2x.png" alt="${weather.main}">
            <div class="temp">${Math.round(temp)}°C</div>
            <div class="description">${weather.main}</div>
        `;
        forecastList.appendChild(forecastItem);
    });

    document.getElementById('forecastContainer').classList.remove('hidden');
}

function showLoading(isLoading) {
    const spinner = document.getElementById('loadingSpinner');
    if (isLoading) {
        spinner.classList.remove('hidden');
    } else {
        spinner.classList.add('hidden');
    }
}

function showError(message) {
    const errorContainer = document.getElementById('errorContainer');
    errorContainer.textContent = '❌ ' + message;
    errorContainer.classList.remove('hidden');
}

function hideError() {
    const errorContainer = document.getElementById('errorContainer');
    errorContainer.classList.add('hidden');
}
