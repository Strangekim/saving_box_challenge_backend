import { shinhanRequest } from "../externalAPI/makeHeader.js";
import { trycatchWrapper } from "./trycatchWrapper.js";

/**
 * 신한 API 호출을 위한 공통 서비스 팩토리
 * @param {string} apiPath - API 경로
 * @param {string} method - HTTP 메서드 (기본: POST)
 * @param {function} responseMapper - 응답 데이터 변환 함수
 * @param {function} requestMapper - 요청 데이터 변환 함수
 * @returns {function} Express 미들웨어 함수
 */
export const createShinhanService = ({
  apiPath,
  method = 'POST',
  responseMapper = (data) => data.REC ?? {},
  requestMapper = (req) => {
    const payload = (req.body && typeof req.body === 'object') ? { ...req.body } : {};
    if ('Header' in payload) delete payload.Header;
    return payload;
  },
  statusCode = 200
}) => {
  const serviceFunction = async (req, res) => {
    const payload = requestMapper(req);

    const data = await shinhanRequest({
      path: apiPath,
      json: payload,
      method,
    });

    res.status(statusCode).send(responseMapper(data));
  };

  return trycatchWrapper(serviceFunction);
};