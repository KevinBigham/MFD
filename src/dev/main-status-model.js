export function buildLoadingState(emptySummary) {
  return {
    loading: true,
    error: '',
    systems: [],
    validation: null,
    summary: emptySummary,
  };
}

export function joinValidationErrors(validation, payloadError) {
  var errs = validation && Array.isArray(validation.errors) ? validation.errors : [];
  if (errs.length > 0) {
    return errs;
  }
  if (typeof payloadError === 'string' && payloadError.length > 0) {
    return [payloadError];
  }
  return ['Unknown validation failure'];
}

export function buildValidationFailureState(validation, payloadError, systems, summary) {
  var errs = joinValidationErrors(validation, payloadError);
  return {
    loading: false,
    error: errs.join('\n'),
    systems: systems,
    validation: validation || { ok: false, errors: errs, checkCount: 0 },
    summary: summary,
  };
}

export function buildSuccessState(validation, systems, summary) {
  return {
    loading: false,
    error: '',
    systems: systems,
    validation: validation,
    summary: summary,
  };
}

export function buildImportFailureState(err, mapRuntimeError, emptySummary) {
  return {
    loading: false,
    error: mapRuntimeError(err),
    systems: [],
    validation: null,
    summary: emptySummary,
  };
}
