import { shinhanRequest } from '../../externalAPI/makeHeader.js'; // ← .js 확장자

export const inquireSavingsProducts = async (req, res, next) => {  // ← 이름 export
  try {
    const payload = (req.body && typeof req.body === 'object') ? { ...req.body } : {};
    if ('Header' in payload) delete payload.Header; // 외부 Header 무시

    const data = await shinhanRequest({
      path: '/edu/savings/inquireSavingsProducts',
      json: payload,
      method: 'POST',
    });

    res.status(200).send(data.REC ?? {});
  } catch (e) {
    next(e);
  }
};
