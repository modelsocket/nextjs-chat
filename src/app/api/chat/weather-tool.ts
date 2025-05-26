const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

export function isWeatherToolEnabled() {
  return WEATHER_API_KEY !== undefined;
}

async function geocode(city: string) {
  let resp = await fetch(
    `http://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${WEATHER_API_KEY}`
  );

  let body = await resp.text();

  if (!resp.ok) {
    throw new Error(`geocode api call failed ${body}`);
  }

  let results = JSON.parse(body);

  if (results.length < 1) {
    throw new Error(`geocode api returned no results`);
  }

  return { lat: results[0].lat, lon: results[0].lon };
}

async function fetchWeather(lat: number, lon: number) {
  let resp = await fetch(
    `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&units=imperial&exclude=minutely,hourly,daily,alerts&appid=${WEATHER_API_KEY}`
  );

  if (!resp.ok) {
    throw new Error(`weather api call failed: ${resp.status}`);
  }

  let results = await resp.json();
  return { temperature: results.current.temp, units: "F" };
}

export const WEATHER_TOOL = {
  name: "get_current_weather",
  description: "Retrieves the current weather for a city",
  fn: async ({ location }: { location: string }) => {
    if (!WEATHER_API_KEY) {
      return { error: "WEATHER_API_KEY is not set" };
    }

    let { lat, lon } = await geocode(location);
    return fetchWeather(lat, lon);
  },
  parameters: {
    location: {
      param_type: "string",
      description:
        'City and State and Country to retrieve the weather for. Do not use nicknames (such as "NYC"), use "<CITY>, <TWO LETTER STATE>, <COUNTRY>", Example: "New York, NY, USA"',
      required: true,
    },
  },
};
