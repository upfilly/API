module.exports = {
    async log(action, modelName, previousState, currentState, performedBy) {
      await AuditTrials.create({
        model: modelName,
        action,
        previousState,
        currentState,
        changedAt: new Date(),
        performedBy,
      }).fetch();
    },
  };