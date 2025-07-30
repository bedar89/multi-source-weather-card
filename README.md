# 🌦️ Multi-Source Weather Consensus Card

A Home Assistant card that intelligently combines multiple weather sources using weighted consensus algorithms to provide more accurate and reliable weather information.

## ✨ Features

- **🧮 Smart Consensus Algorithm**: Combines multiple weather sources with configurable weights
- **📊 Confidence Indicators**: Shows consensus confidence and warns about disagreements
- **🎛️ Visual Configuration**: Easy-to-use editor with tabs and sliders
- **📱 Multiple Display Modes**: Default, Compact, and Detailed views
- **🔧 Auto-Detection**: Automatically finds and configures available weather sources
- **⚠️ Disagreement Warnings**: Alerts when sources significantly disagree
- **📈 Source Breakdown**: Optional display of individual source contributions

## 🚀 Installation

### HACS (Recommended)

1. Open HACS in Home Assistant
2. Go to "Frontend" section
3. Click "Explore & Download Repositories"
4. Search for "Multi-Source Weather Consensus Card"
5. Click "Download"
6. Restart Home Assistant

### Manual Installation

1. Download the latest `multi-source-weather-card.js` from the [releases page](https://github.com/bedar89/multi-source-weather-card/releases)
2. Copy it to your `config/www/` directory
3. Add the resource to your dashboard:
   - Go to Settings → Dashboards → Resources
   - Click "Add Resource"
   - URL: `/local/multi-source-weather-card.js`
   - Resource Type: JavaScript Module
4. Restart Home Assistant

### Development Installation

For testing during development:

1. Clone this repository to your development folder
2. Copy `multi-source-weather-card.js` and `multi-source-weather-card-editor.js` to your `config/www/` directory
3. Add both files as resources in Home Assistant:
   - `/local/multi-source-weather-card.js`
   - `/local/multi-source-weather-card-editor.js`
4. Clear browser cache and restart Home Assistant

## 📋 Usage

### Basic Setup

1. Go to your dashboard
2. Click "Edit Dashboard"
3. Click "Add Card"
4. Search for "Multi-Source Weather Consensus Card"
5. The card will auto-detect your weather sources
6. Configure weights and settings as desired
7. Save the card

### Manual Configuration

```yaml
type: custom:multi-source-weather-card
title: "Weather Consensus"
card_mode: default
sources:
  - entity: weather.met_no
    weight: 35
    enabled: true
  - entity: weather.openweathermap
    weight: 30
    enabled: true
  - entity: weather.buienradar
    weight: 25
    enabled: true
display:
  background: gradient
  border_radius: 8
  show_source_breakdown: false
  show_forecast: true
consensus:
  confidence_threshold: 75
  disagreement_threshold: 25
```

## ⚙️ Configuration Options

### Card Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | string | "Weather Consensus" | Card title |
| `card_mode` | string | "default" | Display mode: `default`, `compact`, `detailed` |

### Sources

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `entity` | string | required | Weather entity ID |
| `weight` | number | 20 | Source weight (0-100) |
| `enabled` | boolean | true | Enable/disable source |

### Display Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `background` | string | "gradient" | Background style: `gradient`, `plain` |
| `border_radius` | number | 8 | Border radius in pixels |
| `show_source_breakdown` | boolean | false | Show individual source contributions |
| `show_forecast` | boolean | true | Show 5-day forecast |

### Consensus Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `confidence_threshold` | number | 75 | Warning threshold for low confidence |
| `disagreement_threshold` | number | 25 | Threshold for disagreement warnings |

## 🎨 Card Modes

### Default Mode
- Full weather information with current conditions
- 5-day forecast strip
- Weather details (humidity, wind, etc.)
- Consensus confidence indicator

### Compact Mode
- Minimal design for small spaces
- Current temperature and condition only
- No forecast or detailed information

### Detailed Mode
- Comprehensive weather information
- Detailed forecast tabs (like Breezy Weather)
- Extended weather metrics
- Source breakdown options

## 🧮 Consensus Algorithm

The card uses several algorithms to combine data from multiple sources:

### Temperature Consensus
- **Weighted Average**: `(temp1×weight1 + temp2×weight2 + ...) / total_weights`
- **Confidence**: Based on temperature spread between sources
- **Formula**: `confidence = max(0, 100 - (spread × 8))`

### Condition Consensus
- **Majority Vote**: Most common condition across sources
- **Fallback**: Highest weighted source if no majority

### Confidence Calculation
- High agreement (≤2°C spread): 85-100% confidence
- Moderate agreement (2-5°C spread): 60-85% confidence  
- Low agreement (>5°C spread): <60% confidence

## 🔧 Recommended Source Weights

Based on accuracy and reliability:

| Source | Suggested Weight | Notes |
|--------|------------------|-------|
| Met.no | 35-40% | Excellent for Europe, good global coverage |
| OpenWeatherMap | 25-30% | Reliable global data |
| Buienradar | 25-30% | Best for Netherlands/Belgium |
| AccuWeather | 15-20% | Good supplement source |
| WeatherAPI | 10-15% | Basic coverage |

## 🐛 Troubleshooting

### Card Not Appearing
1. Ensure the resource is properly added to Home Assistant
2. Clear browser cache (Ctrl+F5)
3. Check browser console for JavaScript errors
4. Verify weather entities exist and are accessible

### No Weather Data
1. Check that you have weather integrations installed
2. Verify entity IDs are correct
3. Ensure entities are not unavailable
4. Try auto-detection by removing all sources from config

### Consensus Issues
1. Verify sources have temperature data
2. Check that weights add up meaningfully
3. Enable source breakdown to debug individual sources
4. Lower confidence threshold if sources commonly disagree

### Configuration Problems
1. Use the visual editor instead of manual YAML
2. Check for typos in entity names
3. Ensure all required fields are present
4. Validate YAML syntax

## 🛠️ Development

### Setup
```bash
git clone https://github.com/bedar89/multi-source-weather-card.git
cd multi-source-weather-card
npm install
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Testing
Copy files to `config/www/` and add as resources in Home Assistant.

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Credits

- Inspired by Breezy Weather app design
- Uses Home Assistant's weather entity architecture
- Built with Lit Element for modern web components

## 📊 Statistics

- **Lines of Code**: ~800
- **Bundle Size**: ~15KB (minified)
- **Browser Support**: Modern browsers (ES2017+)
- **Home Assistant**: 2023.4.0+

---

**⭐ If this card is useful to you, please consider starring the repository!**
