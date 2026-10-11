import React, { useEffect } from 'react';

export const UnsavedChangesBar = ({
  show,
  onSave,
  onDiscard,
  isSaving = false,
  message = 'Unsaved changes',
  saveLabel = 'Save',
  discardLabel = 'Discard'
}) => {
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (show) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [show]);

  if (!show) return null;

  return (
    <div className="admin-unsaved-bar-container">
      <div className="admin-unsaved-bar">
        <div className="admin-unsaved-info">
          <span className="admin-unsaved-dot" />
          <span className="admin-unsaved-text">{message}</span>
        </div>
        <div className="admin-unsaved-actions">
          {onDiscard && (
            <button
              type="button"
              onClick={onDiscard}
              disabled={isSaving}
              className="admin-unsaved-discard-btn"
            >
              {discardLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="admin-unsaved-save-btn"
          >
            {isSaving ? 'Saving...' : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnsavedChangesBar;
