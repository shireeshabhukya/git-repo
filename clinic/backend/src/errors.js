export class ApiError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details; }
}
export const badRequest = (details) => new ApiError(400, 'Validation failed', details);
export const notFound = (what) => new ApiError(404, `${what} not found`);
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function errorHandler(err, req, res, _next) {
  let { status, message, details } = err;
  if (err.code === '23P01') { status = 409; message = 'Doctor already has an appointment that overlaps this time'; }
  else if (err.code === '23503') { status = 409; message = 'Record is referenced by other data (e.g. appointments) and cannot be removed'; }
  else if (err.code === '23505') { status = 409; message = 'A record with the same unique value already exists'; }
  else if (err.code === '22P02' || err.code === '22007' || err.code === '22008') { status = 400; message = 'Invalid value format'; }
  else if (err.type === 'entity.parse.failed') { status = 400; message = 'Malformed JSON body'; }
  if (!status) { status = 500; message = 'Internal server error'; console.error(err); }
  res.status(status).json({ error: { status, message, ...(details && { details }) } });
}
