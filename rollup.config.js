import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from '@rollup/plugin-terser';

export default {
  input: ['multi-source-weather-card.js', 'multi-source-weather-card-editor.js'],
  output: {
    dir: 'dist',
    format: 'es',
  },
  plugins: [
    nodeResolve(),
    terser()
  ]
};
