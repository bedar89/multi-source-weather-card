import { LitElement, html, css } from 'lit';

const VERSION = '1.0.0';

// Console info
console.info(
  `%c MULTI-SOURCE-WEATHER-CARD %c v${VERSION} `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray'
);

class MultiSourceWeatherCard extends LitElement {
  static getConfigElement() {
    return document.createElement('multi-source-weather-card-editor');
  }

  static getStubConfig() {
    return {
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
        confidence_threshold: 75,
        disagreement_threshold: 25
      }
    };
  }

  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      _consensusData: { type: Object }
    };
  }

  constructor() {
    super();
    this._consensusData = null;
  }

  setConfig(config) {
    if (!config) {
      throw new Error('Invalid configuration');
    }

    this.config = {
      title: 'Weather Consensus',
      card_mode: 'default',
      sources: [],
      display: {
        background: 'gradient',
        border_radius: 8,
        show_source_breakdown: false,
        show_forecast: true,
        ...config.display
      },
      consensus: {
        confidence_threshold: 75,
        disagreement_threshold: 25,
        ...config.consensus
      },
      ...config
    };

    // Auto-detect weather entities if no sources configured
    if (this.config.sources.length === 0) {
      this._autoDetectSources();
    }
  }

  _autoDetectSources() {
    if (!this.hass) return;

    const weatherEntities = Object.keys(this.hass.states)
      .filter(entityId => entityId.startsWith('weather.'))
      .map(entityId => {
        const entity = this.hass.states[entityId];
        const integrationName = this._getIntegrationName(entityId);
        
        return {
          entity: entityId,
          weight: this._getSuggestedWeight(integrationName),
          enabled: true
        };
      })
      .slice(0, 5); // Limit to 5 sources max

    this.config = {
      ...this.config,
      sources: weatherEntities
    };
  }

  _getIntegrationName(entityId) {
    const parts = entityId.split('.');
    const name = parts[1] || '';
    
    // Common mappings
    const mappings = {
      'met_no': 'met.no',
      'openweathermap': 'OpenWeatherMap',
      'buienradar': 'Buienradar',
      'accuweather': 'AccuWeather',
      'weatherapi': 'WeatherAPI'
    };

    return mappings[name] || name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  _getSuggestedWeight(integrationName) {
    const weights = {
      'met.no': 35,
      'OpenWeatherMap': 30,
      'Buienradar': 25,
      'AccuWeather': 20,
      'WeatherAPI': 15
    };

    return weights[integrationName] || 20;
  }

  updated(changedProps) {
    super.updated(changedProps);
    
    if (changedProps.has('hass') || changedProps.has('config')) {
      this._calculateConsensus();
    }
  }

  _calculateConsensus() {
    if (!this.hass || !this.config.sources) {
      this._consensusData = null;
      return;
    }

    const activeSources = this.config.sources.filter(source => 
      source.enabled && this.hass.states[source.entity]
    );

    if (activeSources.length === 0) {
      this._consensusData = null;
      return;
    }

    const totalWeight = activeSources.reduce((sum, source) => sum + source.weight, 0);
    
    if (totalWeight === 0) {
      this._consensusData = null;
      return;
    }

    // Calculate weighted temperature
    let weightedTemp = 0;
    let temps = [];
    let conditions = [];
    let validSources = [];

    activeSources.forEach(source => {
      const entity = this.hass.states[source.entity];
      if (entity && entity.attributes.temperature !== undefined) {
        const temp = parseFloat(entity.attributes.temperature);
        if (!isNaN(temp)) {
          weightedTemp += temp * source.weight;
          temps.push(temp);
          conditions.push(entity.state);
          validSources.push({
            ...source,
            temperature: temp,
            condition: entity.state,
            entity_name: entity.attributes.friendly_name || source.entity
          });
        }
      }
    });

    if (validSources.length === 0) {
      this._consensusData = null;
      return;
    }

    const consensusTemp = Math.round(weightedTemp / totalWeight);
    
    // Calculate confidence based on temperature spread
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    const spread = maxTemp - minTemp;
    const confidence = Math.max(0, Math.min(100, 100 - (spread * 8)));

    // Determine consensus condition (majority vote)
    const conditionCounts = {};
    conditions.forEach(condition => {
      conditionCounts[condition] = (conditionCounts[condition] || 0) + 1;
    });
    
    const consensusCondition = Object.keys(conditionCounts).reduce((a, b) => 
      conditionCounts[a] > conditionCounts[b] ? a : b
    );

    // Get additional data from primary source (highest weight)
    const primarySource = validSources.reduce((a, b) => a.weight > b.weight ? a : b);
    const primaryEntity = this.hass.states[primarySource.entity];

    this._consensusData = {
      temperature: consensusTemp,
      condition: consensusCondition,
      confidence: Math.round(confidence),
      spread: spread,
      humidity: primaryEntity.attributes.humidity,
      pressure: primaryEntity.attributes.pressure,
      wind_speed: primaryEntity.attributes.wind_speed,
      wind_bearing: primaryEntity.attributes.wind_bearing,
      visibility: primaryEntity.attributes.visibility,
      forecast: primaryEntity.attributes.forecast,
      sources: validSources,
      primary_source: primarySource
    };

    this.requestUpdate();
  }

  _renderIcon(condition) {
    const iconMap = {
      'clear-night': '🌙',
      'cloudy': '☁️',
      'fog': '🌫️',
      'hail': '🧊',
      'lightning': '⛈️',
      'lightning-rainy': '⛈️',
      'partlycloudy': '⛅',
      'pouring': '🌧️',
      'rainy': '🌦️',
      'snowy': '🌨️',
      'snowy-rainy': '🌨️',
      'sunny': '☀️',
      'windy': '💨',
      'windy-variant': '💨',
      'exceptional': '❗'
    };

    return iconMap[condition] || '🌤️';
  }

  _renderWarningBanner() {
    if (!this._consensusData) return '';

    const { confidence } = this._consensusData;
    const threshold = this.config.consensus.confidence_threshold;

    if (confidence >= threshold) return '';

    return html`
      <div class="warning-banner">
        <strong>⚠️ Low Consensus Warning</strong><br>
        Sources disagree significantly - confidence below ${threshold}%
      </div>
    `;
  }

  _renderSourceBreakdown() {
    if (!this.config.display.show_source_breakdown || !this._consensusData) {
      return '';
    }

    return html`
      <div class="source-breakdown">
        <div class="source-breakdown-title">Source Breakdown</div>
        ${this._consensusData.sources.map(source => html`
          <div class="source-item">
            <span>${source.entity_name}: ${source.temperature}°C</span>
            <span class="source-weight">${source.weight}%</span>
          </div>
        `)}
      </div>
    `;
  }

  _renderForecast() {
    if (!this.config.display.show_forecast || !this._consensusData?.forecast) {
      return '';
    }

    const forecast = this._consensusData.forecast.slice(0, 5);

    return html`
      <div class="forecast-strip">
        ${forecast.map((day, index) => html`
          <div class="forecast-item">
            <div class="forecast-day">
              ${index === 0 ? 'Today' : new Date(day.datetime).toLocaleDateString('en', { weekday: 'short' })}
            </div>
            <div class="forecast-icon">${this._renderIcon(day.condition)}</div>
            <div class="forecast-temp">
              ${Math.round(day.temperature)}°${day.templow ? `/${Math.round(day.templow)}°` : ''}
            </div>
          </div>
        `)}
      </div>
    `;
  }

  render() {
    if (!this.hass) {
      return html`<div class="error">Home Assistant not available</div>`;
    }

    if (!this._consensusData) {
      return html`
        <ha-card>
          <div class="card-content">
            <div class="no-data">
              <div class="icon">🌤️</div>
              <div class="title">No Weather Data</div>
              <div class="subtitle">Configure weather sources to see consensus data</div>
            </div>
          </div>
        </ha-card>
      `;
    }

    const { temperature, condition, confidence, humidity, wind_speed } = this._consensusData;
    const cardClass = `weather-card ${this.config.card_mode || 'default'} ${this.config.display.background}`;

    return html`
      ${this._renderWarningBanner()}
      
      <ha-card style="border-radius: ${this.config.display.border_radius}px;">
        <div class="${cardClass}">
          <div class="weather-header">
            <div>
              <div class="weather-title">${this.config.title}</div>
              <div class="weather-subtitle">Updated just now</div>
            </div>
            <div class="consensus-badge confidence-${confidence < this.config.consensus.confidence_threshold ? 'low' : 'high'}">
              ${confidence}% confidence
            </div>
          </div>

          <div class="weather-main">
            <div class="weather-icon">${this._renderIcon(condition)}</div>
            <div class="weather-info">
              <div class="weather-temp">${temperature}°C</div>
              <div class="weather-condition">${condition.replace(/-/g, ' ')}</div>
            </div>
            <div class="weather-extra">
              <div>Feels like ${temperature + 2}°C</div>
              <div>${this._consensusData.sources.length}/${this.config.sources.length} sources active</div>
            </div>
          </div>

          ${this.config.card_mode !== 'compact' ? html`
            <div class="weather-details">
              <div class="weather-detail">
                <div class="weather-detail-value">${Math.round((this._consensusData.forecast?.[0]?.precipitation || 0) * 100)}%</div>
                <div class="weather-detail-label">🌧️ Rain</div>
              </div>
              <div class="weather-detail">
                <div class="weather-detail-value">${Math.round(wind_speed || 0)} km/h</div>
                <div class="weather-detail-label">💨 Wind</div>
              </div>
              <div class="weather-detail">
                <div class="weather-detail-value">${humidity || 0}%</div>
                <div class="weather-detail-label">💧 Humidity</div>
              </div>
            </div>
          ` : ''}

          ${this.config.card_mode !== 'compact' ? this._renderForecast() : ''}
          ${this._renderSourceBreakdown()}
        </div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: block;
      }

      ha-card {
        overflow: hidden;
        transition: all 0.3s ease;
      }

      .error, .no-data {
        padding: 24px;
        text-align: center;
        color: var(--secondary-text-color);
      }

      .no-data .icon {
        font-size: 3rem;
        margin-bottom: 16px;
      }

      .no-data .title {
        font-size: 1.2rem;
        font-weight: 500;
        margin-bottom: 8px;
        color: var(--primary-text-color);
      }

      .warning-banner {
        background: linear-gradient(90deg, #f44336, #ff9800);
        color: white;
        padding: 12px 16px;
        margin-bottom: 16px;
        border-radius: 8px;
        font-size: 0.9rem;
      }

      .weather-card {
        padding: 20px;
        position: relative;
        color: white;
      }

      .weather-card.default.gradient,
      .weather-card.detailed.gradient {
        background: linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%);
      }

      .weather-card.default.plain,
      .weather-card.detailed.plain {
        background: var(--card-background-color);
        color: var(--primary-text-color);
      }

      .weather-card.compact {
        padding: 16px;
      }

      .weather-card.compact .weather-details,
      .weather-card.compact .forecast-strip {
        display: none;
      }

      .weather-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 16px;
      }

      .weather-title {
        font-size: 1.1rem;
        font-weight: 500;
        opacity: 0.9;
      }

      .weather-subtitle {
        font-size: 0.85rem;
        opacity: 0.7;
        margin-top: 2px;
      }

      .consensus-badge {
        padding: 4px 12px;
        border-radius: 16px;
        font-size: 0.85rem;
        font-weight: 500;
        background: rgba(255,255,255,0.2);
      }

      .consensus-badge.confidence-low {
        background: rgba(255,100,100,0.3);
      }

      .weather-main {
        display: flex;
        align-items: center;
        gap: 20px;
        margin-bottom: 20px;
      }

      .weather-icon {
        font-size: 3rem;
      }

      .weather-card.compact .weather-icon {
        font-size: 2rem;
      }

      .weather-temp {
        font-size: 3.5rem;
        font-weight: 300;
        line-height: 1;
      }

      .weather-card.compact .weather-temp {
        font-size: 2.5rem;
      }

      .weather-condition {
        font-size: 1.2rem;
        opacity: 0.9;
        margin-top: 4px;
        text-transform: capitalize;
      }

      .weather-extra {
        margin-left: auto;
        text-align: right;
        font-size: 0.9rem;
        opacity: 0.8;
      }

      .weather-details {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
        margin-bottom: 20px;
      }

      .weather-detail {
        text-align: center;
      }

      .weather-detail-value {
        font-size: 1.2rem;
        font-weight: 600;
        margin-bottom: 4px;
      }

      .weather-detail-label {
        font-size: 0.9rem;
        opacity: 0.8;
      }

      .forecast-strip {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 16px;
      }

      .forecast-item {
        text-align: center;
        padding: 12px 8px;
        background: rgba(255,255,255,0.1);
        border-radius: 8px;
      }

      .weather-card.plain .forecast-item {
        background: rgba(0,0,0,0.05);
      }

      .forecast-day {
        font-size: 0.85rem;
        opacity: 0.8;
        margin-bottom: 8px;
      }

      .forecast-icon {
        font-size: 1.8rem;
        margin: 8px 0;
      }

      .forecast-temp {
        font-size: 0.9rem;
        font-weight: 500;
      }

      .source-breakdown {
        background: rgba(0,0,0,0.1);
        border-radius: 8px;
        padding: 16px;
        margin-top: 20px;
      }

      .weather-card.plain .source-breakdown {
        background: rgba(0,0,0,0.05);
      }

      .source-breakdown-title {
        font-size: 0.95rem;
        margin-bottom: 12px;
        opacity: 0.9;
      }

      .source-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        font-size: 0.9rem;
      }

      .source-weight {
        background: rgba(255,255,255,0.2);
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.8rem;
      }

      .weather-card.plain .source-weight {
        background: rgba(0,0,0,0.1);
      }
    `;
  }
}

// Register the card
customElements.define('multi-source-weather-card', MultiSourceWeatherCard);

// Register with card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'multi-source-weather-card',
  name: 'Multi-Source Weather Consensus Card',
  description: 'A card that combines multiple weather sources with intelligent consensus algorithms',
  preview: false,
  documentationURL: 'https://github.com/bedar89/multi-source-weather-card'
});
