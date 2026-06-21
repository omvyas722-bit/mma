function emit(broadcast, agent, step, detail) {
  if (!broadcast) return;
  broadcast({ type: 'agent:step', agent, step, detail, timestamp: new Date().toISOString() });
}

module.exports = { emit };
