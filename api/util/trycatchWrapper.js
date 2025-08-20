export const trycatchWrapper = (requestHandler) => {
  return async (req, res, next) => {
    try {
      await requestHandler(req, res, next);
    } catch (e) {
      next(e);
    }
  };
};
