// Multi-Source Weather Consensus Card v1.0.0
console.info(
  '%c MULTI-SOURCE-WEATHER-CARD %c v1.0.0 ',
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray'
);

class MultiSourceWeatherCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._consensusData = null;
    this.config = {};
  }

  static getConfigElement() {
    return document.createElement('multi-source-weather-card-editor');
  }

  static getStubConfig() {
    return {
      type: 'custom:multi-source-weather-card',
      title: 'Weather Consensus',
      card_mode: 'default',
      sources: [],
      display: {
        background: 'gradient',
        border_radius: 8,
        show_source_breakdown: false,
        show_forecast: true
      },
      consensus: {
        confidence_threshold: 75
      }
    };
  }

  set hass(hass) {
    if (!hass) return;
    
    this._hass = hass;
    
    // Auto-detect sources if none configured
    if (!this.config.sources || this.config.sources.length === 0) {
      this._autoDetectSources();
    }
    
    this._calculateConsensus();
    this._render();
  }

  setConfig(config) {
    if (!config) {
      throw new Error('Invalid configuration');
    }

    this.config = {
      type: 'custom:multi-source-weather-card',
      title: 'Weather Consensus',
      card_mode: 'default',
      sources: [],
      display: {
        background: 'gradient',
        border_radius: 8,
        show_source_breakdown: false,
        show_forecast: true,
        ...(config.display || {})
      },
      consensus: {
        confidence_threshold: 75,
        ...(config.consensus || {})
      },
      ...config
    };

    this._render();
  }

  _autoDetectSources() {
    if (!this._hass) return;

    const weatherEntities = Object.keys(this._hass.states)
      .filter(entityId => entityId.startsWith('weather.'))
      .slice(0, 4) // Limit to 4 sources
      .map((entityId, index) => {
        const weights = [35, 30, 25, 10]; // Default weights
        return {
          entity: entityId,
          weight: weights[index] || 20,
          enabled: true
        };
      });

    if (weatherEntities.length > 0) {
      this.config.sources = weatherEntities;
    }
  }

  _calculateConsensus() {
    if (!this._hass || !this.config.sources) {
      this._consensusData = null;
      return;
    }

    const activeSources = this.config.sources.filter(source => 
      source.enabled && this._hass.states[source.entity]
    );

    if (activeSources.length === 0) {
      this._consensusData = null;
      return;
    }

    const totalWeight = activeSources.reduce((sum, source) => sum + (source.weight || 0), 0);
    
    if (totalWeight === 0) {
      this._consensusData = null;
      return;
    }

    // Calculate weighted temperature
    let weightedTemp = 0;
    let temps = [];
    let validSources = [];

    activeSources.forEach(source => {
      const entity = this._hass.states[source.entity];
      if (entity && entity.attributes && typeof entity.attributes.temperature === 'number') {
        const temp = entity.attributes.temperature;
        weightedTemp += temp * source.weight;
        temps.push(temp);
        validSources.push({
          entity: source.entity,
          weight: source.weight,
          temperature: temp,
          condition: entity.state,
          name: entity.attributes.friendly_name || source.entity
        });
      }
    });

    if (validSources.length === 0) {
      this._consensusData = null;
      return;
    }

    const consensusTemp = Math.round(weightedTemp / totalWeight);
    
    // Calculate confidence
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    const spread = maxTemp - minTemp;
    const confidence = Math.max(0, Math.min(100, 100 - (spread * 8)));

    // Get primary source for other data
    const primarySource = validSources[0];
    const primaryEntity = this._hass.states[primarySource.entity];

    this._consensusData = {
      temperature: consensusTemp,
      condition: primaryEntity.state || 'unknown',
      confidence: Math.round(confidence),
      humidity: primaryEntity.attributes.humidity || 0,
      wind_speed: primaryEntity.attributes.wind_speed || 0,
      forecast: primaryEntity.attributes.forecast || [],
      sources: validSources
    };
  }

  _getWeatherIcon(condition) {
    const icons = {
      'clear-night': '🌙',
      'cloudy': '☁️',
      'fog': '🌫️',
      'lightning': '⛈️',
      'lightning-rainy': '⛈️',
      'partlycloudy': '⛅',
      'pouring': '🌧️',
      'rainy': '🌦️',
      'snowy': '🌨️',
      'sunny': '☀️',
      'windy': '💨'
    };
    return icons[condition] || '🌤️';
  }

  _render() {
    if (!this._consensusData) {
      this.shadowRoot.innerHTML = `
        <style>${this._getStyles()}</style>
        <ha-card>
          <div class="no-data">
            <div>🌤️</div>
            <div>No Weather Data Available</div>
            <div>Configure weather sources</div>
          </div>
        </ha-card>
      `;
      return;
    }

    const data = this._consensusData;
    const config = this.config;
    
    // Warning banner
    const showWarning = data.confidence < (config.consensus?.confidence_threshold || 75);
    const warningHtml = showWarning ? `
      <div class="warning-banner">
        ⚠️ Low consensus confidence (${data.confidence}%)
      </div>
    ` : '';

    // Source breakdown
    const breakdownHtml = config.display?.show_source_breakdown ? `
      <div class="source-breakdown">
        <div class="breakdown-title">Source Breakdown</div>
        ${data.sources.map(source => `
          <div class="source-item">
            <span>${source.name}: ${source.temperature}°C</span>
            <span class="weight">${source.weight}%</span>
          </div>
        `).join('')}
      </div>
    ` : '';

    // Forecast
    const forecastHtml = config.display?.show_forecast && data.forecast?.length > 0 ? `
      <div class="forecast">
        ${data.forecast.slice(0, 5).map((day, index) => `
          <div class="forecast-day">
            <div class="day-name">${index === 0 ? 'Today' : new Date(day.datetime).toLocaleDateString('en', { weekday: 'short' })}</div>
            <div class="day-icon">${this._getWeatherIcon(day.condition)}</div>
            <div class="day-temp">${Math.round(day.temperature || 0)}°</div>
          </div>
        `).join('')}
      </div>
    ` : '';

    this.shadowRoot.innerHTML = `
      <style>${this._getStyles()}</style>
      ${warningHtml}
      <ha-card style="border-radius: ${config.display?.border_radius || 8}px;">
        <div class="weather-card ${config.card_mode || 'default'} ${config.display?.background || 'gradient'}">
          <div class="header">
            <div class="title-section">
              <div class="title">${config.title || 'Weather Consensus'}</div>
              <div class="subtitle">Updated now</div>
            </div>
            <div class="confidence-badge ${data.confidence < 75 ? 'low' : 'high'}">
              ${data.confidence}% confidence
            </div>
          </div>
          
          <div class="main-weather">
            <div class="weather-icon">${this._getWeatherIcon(data.condition)}</div>
            <div class="weather-info">
              <div class="temperature">${data.temperature}°C</div>
              <div class="condition">${data.condition.replace(/-/g, ' ')}</div>
            </div>
            <div class="extra-info">
              <div>Humidity: ${data.humidity}%</div>
              <div>${data.sources.length} sources</div>
            </div>
          </div>

          ${config.card_mode !== 'compact' ? `
            <div class="weather-details">
              <div class="detail">
                <div class="detail-value">0%</div>
                <div class="detail-label">🌧️ Rain</div>
              </div>
              <div class="detail">
                <div class="detail-value">${Math.round(data.wind_speed)}km/h</div>
                <div class="detail-label">💨 Wind</div>
              </div>
              <div class="detail">
                <div class="detail-value">${data.humidity}%</div>
                <div class="detail-label">💧 Humidity</div>
              </div>
            </div>
          ` : ''}

          ${forecastHtml}
          ${breakdownHtml}
        </div>
      </ha-card>
    `;
  }

  _getStyles() {
    return `
      :host {
        display: block;
      }
      
      ha-card {
        overflow: hidden;
        box-shadow: var(--ha-card-box-shadow, 0 2px 4px rgba(0,0,0,0.1));
      }
      
      .no-data {
        padding: 48px 24px;
        text-align: center;
        color: var(--secondary-text-color);
        font-size: 16px;
        line-height: 1.5;
      }
      
      .no-data div:first-child {
        font-size: 48px;
        margin-bottom: 16px;
      }
      
      .warning-banner {
        background: linear-gradient(90deg, #f44336, #ff9800);
        color: white;
        padding: 12px 16px;
        margin: 0 0 16px 0;
        font-size: 14px;
        border-radius: 4px;
      }
      
      .weather-card {
        padding: 20px;
        color: white;
        position: relative;
      }
      
      .weather-card.gradient {
        background: linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%);
      }
      
      .weather-card.plain {
        background: var(--card-background-color, #fff);
        color: var(--primary-text-color, #000);
      }
      
      .weather-card.compact {
        padding: 16px;
      }
      
      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 20px;
      }
      
      .title {
        font-size: 18px;
        font-weight: 500;
        margin-bottom: 4px;
      }
      
      .subtitle {
        font-size: 14px;
        opacity: 0.8;
      }
      
      .confidence-badge {
        padding: 6px 12px;
        border-radius: 16px;
        font-size: 12px;
        font-weight: 600;
        background: rgba(255,255,255,0.2);
      }
      
      .confidence-badge.low {
        background: rgba(244,67,54,0.3);
      }
      
      .main-weather {
        display: flex;
        align-items: center;
        gap: 20px;
        margin-bottom: 24px;
      }
      
      .weather-icon {
        font-size: 64px;
        line-height: 1;
      }
      
      .temperature {
        font-size: 48px;
        font-weight: 300;
        line-height: 1;
        margin-bottom: 4px;
      }
      
      .condition {
        font-size: 16px;
        opacity: 0.9;
        text-transform: capitalize;
      }
      
      .extra-info {
        margin-left: auto;
        text-align: right;
        font-size: 14px;
        opacity: 0.8;
        line-height: 1.4;
      }
      
      .weather-details {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
        margin-bottom: 24px;
      }
      
      .detail {
        text-align: center;
      }
      
      .detail-value {
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 4px;
      }
      
      .detail-label {
        font-size: 12px;
        opacity: 0.8;
      }
      
      .forecast {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 12px;
        margin-bottom: 16px;
      }
      
      .forecast-day {
        text-align: center;
        padding: 12px 8px;
        background: rgba(255,255,255,0.1);
        border-radius: 8px;
      }
      
      .day-name {
        font-size: 12px;
        margin-bottom: 8px;
        opacity: 0.8;
      }
      
      .day-icon {
        font-size: 24px;
        margin: 8px 0;
      }
      
      .day-temp {
        font-size: 14px;
        font-weight: 500;
      }
      
      .source-breakdown {
        background: rgba(0,0,0,0.1);
        padding: 16px;
        border-radius: 8px;
        margin-top: 16px;
      }
      
      .breakdown-title {
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 12px;
      }
      
      .source-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 0;
        font-size: 13px;
      }
      
      .weight {
        background: rgba(255,255,255,0.2);
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
      }
      
      /* Compact mode adjustments */
      .weather-card.compact .weather-icon {
        font-size: 48px;
      }
      
      .weather-card.compact .temperature {
        font-size: 36px;
      }
      
      .weather-card.compact .weather-details,
      .weather-card.compact .forecast {
        display: none;
      }
    `;
  }

  getCardSize() {
    return this.config?.card_mode === 'compact' ? 2 : 4;
  }
}

// Register the custom element
if (!customElements.get('multi-source-weather-card')) {
  customElements.define('multi-source-weather-card', MultiSourceWeatherCard);
  console.log('Multi-Source Weather Card registered successfully');
}

// Add to card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'multi-source-weather-card',
  name: 'Multi-Source Weather Consensus Card',
  description: 'Combines multiple weather sources with intelligent consensus algorithms'
});
