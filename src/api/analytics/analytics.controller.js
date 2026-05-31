const analyticsService = require("./analytics.service");
const responses = require("../../utility/responses");

const overdue = async (req, res) => {
  try {
    const result = await analyticsService.getOverdue({ organizationId: req.organizationId });
    return responses.success(res, result.data, result.message);
  } catch (err) {
    console.error(err);
    return responses.internalError(res);
  }
};

const summary = async (req, res) => {
  try {
    const result = await analyticsService.getSummary({ organizationId: req.organizationId });
    return responses.success(res, result.data, result.message);
  } catch (err) {
    console.error(err);
    return responses.internalError(res);
  }
};

module.exports = { overdue, summary };
