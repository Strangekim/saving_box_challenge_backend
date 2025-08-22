export const validateSchema = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        message: error.details[0].message 
      });
    }
    next();
  };
};

// query parameter 검증 미들웨어
export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({ 
        message: error.details[0].message 
      });
    }
    // 검증된 값으로 덮어쓰기 (기본값 적용 등)
    req.query = value;
    next();
  };
};

// URL parameter 검증 미들웨어
export const validateParams = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.params);
    if (error) {
      return res.status(400).json({ 
        message: error.details[0].message 
      });
    }
    next();
  };
};

// 통합 검증 미들웨어 (원하는 부분만 검증)
export const validate = ({ body, query, params }) => {
  return (req, res, next) => {
    // body 검증
    if (body) {
      const { error } = body.validate(req.body);
      if (error) {
        return res.status(400).json({ 
          message: `Body validation error: ${error.details[0].message}` 
        });
      }
    }
    
    // query 검증 및 기본값 적용
    if (query) {
      const { error, value } = query.validate(req.query);
      if (error) {
        return res.status(400).json({ 
          message: `Query validation error: ${error.details[0].message}` 
        });
      }
      req.query = value; // 검증된 값으로 덮어쓰기
    }
    
    // params 검증
    if (params) {
      const { error } = params.validate(req.params);
      if (error) {
        return res.status(400).json({ 
          message: `Params validation error: ${error.details[0].message}` 
        });
      }
    }
    
    next();
  };
};