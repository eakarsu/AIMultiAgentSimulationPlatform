'use strict';
const NAMES = ['REPOSITORY', 'CI', 'MODEL', 'TELEMETRY', 'SECRETS', 'ARTIFACTS', 'TICKETING', 'SANDBOX'];
function adapterReadiness(env = process.env) {
  const adapters = NAMES.map((name) => ({
    name: name.toLowerCase(), enabled: env[`${name}_ADAPTER_ENABLED`] === 'true',
    ready: env[`${name}_ADAPTER_ENABLED`] === 'true' && Boolean(env[`${name}_ADAPTER_URL`]) && Boolean(env[`${name}_ADAPTER_TOKEN`]),
  }));
  return { ready: adapters.every((item) => item.ready), adapters };
}
function requireAdapter(name, env = process.env) {
  const item = adapterReadiness(env).adapters.find((candidate) => candidate.name === String(name).toLowerCase());
  if (!item?.ready) throw Object.assign(new Error(`${name} adapter is not ready`), { code: 'ADAPTER_NOT_READY' });
  return item;
}
module.exports = { NAMES, adapterReadiness, requireAdapter };
