/**
 * Runtime loader helpers for the async module-validation entrypoint.
 * Keeps snapshot normalization logic testable and isolated.
 */

export function coerceValidationErrors(validation, fallbackError) {
  var errs = validation && Array.isArray(validation.errors) ? validation.errors : [];
  if (errs.length > 0) {
    return errs;
  }
  if (validation && validation.ok) {
    return [];
  }
  if (typeof fallbackError === 'string' && fallbackError.length > 0) {
    return [fallbackError];
  }
  return ['Unknown validation failure'];
}

export function resolveRuntimePayload(runtimeModule, emptySummary) {
  var fallbackSummary = emptySummary || {};
  var fallbackValidation = { ok: false, errors: ['Unknown validation failure'], checkCount: 0 };

  if (!runtimeModule || typeof runtimeModule !== 'object') {
    return {
      validation: fallbackValidation,
      systems: [],
      summary: fallbackSummary,
      error: 'Runtime module is missing or invalid',
    };
  }

  var snapshot = typeof runtimeModule.buildModuleValidationSnapshot === 'function'
    ? runtimeModule.buildModuleValidationSnapshot()
    : {
        validation: typeof runtimeModule.runModuleValidation === 'function'
          ? runtimeModule.runModuleValidation()
          : null,
        statusRows: typeof runtimeModule.buildModuleStatusRows === 'function'
          ? runtimeModule.buildModuleStatusRows()
          : [],
        summary: runtimeModule.PHASE1_SUMMARY || fallbackSummary,
      };

  var validation = snapshot && snapshot.validation ? snapshot.validation : null;
  var systems = snapshot && Array.isArray(snapshot.statusRows) ? snapshot.statusRows : [];
  var summary = snapshot && snapshot.summary ? snapshot.summary : (runtimeModule.PHASE1_SUMMARY || fallbackSummary);

  if (!validation) {
    return {
      validation: fallbackValidation,
      systems: systems,
      summary: summary,
      error: 'Runtime snapshot missing validation',
    };
  }

  var normalizedValidation = {
    ok: !!validation.ok,
    errors: coerceValidationErrors(validation, ''),
    checkCount: typeof validation.checkCount === 'number' ? validation.checkCount : 0,
  };

  return {
    validation: normalizedValidation,
    systems: systems,
    summary: summary,
    error: '',
  };
}
