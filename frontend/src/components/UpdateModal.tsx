/**
 * UpdateModal - Shows deployment-specific instructions for updating to a new version
 */

import { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { getUpdateInfo, getAvailableReleases, type UpdateInfo, type Release } from '../api/client';
import { VersionBadge } from './VersionBadge';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetVersion?: string;
}

export function UpdateModal({ isOpen, onClose, targetVersion }: UpdateModalProps) {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [releases, setReleases] = useState<{ stable: Release[]; beta: Release[] }>({ stable: [], beta: [] });
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(targetVersion || null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([getUpdateInfo(), getAvailableReleases()])
        .then(([info, releasesData]) => {
          setUpdateInfo(info);
          setReleases({
            stable: releasesData.stable_releases,
            beta: releasesData.beta_releases,
          });
          if (!selectedVersion && releasesData.stable_releases.length > 0) {
            // Select the latest non-current version by default
            const latest = releasesData.stable_releases.find(r => !r.is_current);
            if (latest) setSelectedVersion(latest.version);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, selectedVersion]);

  const getDeploymentLabel = () => {
    switch (updateInfo?.deployment_type) {
      case 'railway':
        return 'Railway';
      case 'docker':
        return 'Docker';
      default:
        return 'Local';
    }
  };

  const DeploymentIcon = () => {
    const iconClass = "w-5 h-5";
    // Railway gets a flag icon, Docker and Local both use Docker icon
    if (updateInfo?.deployment_type === 'railway') {
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" y1="22" x2="4" y2="15" />
        </svg>
      );
    }
    // Docker and Local both use Docker
    return (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12.5c-.5-1-1.5-1.5-2.5-1.5h-1V9c0-.5-.5-1-1-1h-2V6c0-.5-.5-1-1-1h-4c-.5 0-1 .5-1 1v2H7c-.5 0-1 .5-1 1v2H5c-.5 0-1 .5-1 1v2H2.5" />
        <rect x="6" y="11" width="2" height="2" rx="0.5" />
        <rect x="9" y="11" width="2" height="2" rx="0.5" />
        <rect x="12" y="11" width="2" height="2" rx="0.5" />
        <rect x="9" y="8" width="2" height="2" rx="0.5" />
        <rect x="12" y="8" width="2" height="2" rx="0.5" />
        <path d="M2 17c6 0 8-3 10-3s4 3 10 3" />
      </svg>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Update Instructions"
      description={`How to update your ${getDeploymentLabel()} deployment`}
      maxWidth="lg"
      footer={
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg transition-colors"
          style={{
            backgroundColor: 'var(--monarch-bg-input)',
            color: 'var(--monarch-text)',
          }}
        >
          Got it, Close
        </button>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Current Version */}
          <div
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: 'var(--monarch-bg-input)',
              borderColor: 'var(--monarch-border)',
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>Current Version</div>
                <div className="text-lg font-medium flex items-center gap-2" style={{ color: 'var(--monarch-text-dark)' }}>
                  v{updateInfo?.current_version}
                  <VersionBadge
                    version={updateInfo?.current_version || ''}
                    channel={updateInfo?.current_channel}
                  />
                </div>
              </div>
              <div
                className="p-2 rounded-lg"
                style={{
                  backgroundColor: 'var(--monarch-bg-card)',
                  color: 'var(--monarch-text-muted)',
                }}
                title={getDeploymentLabel()}
              >
                <DeploymentIcon />
              </div>
            </div>
          </div>

          {/* Available Versions */}
          {(releases.stable.length > 0 || releases.beta.length > 0) && (
            <div className="space-y-4">
              {/* Stable Releases */}
              {releases.stable.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                      Stable Releases
                    </h3>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: 'var(--monarch-success-bg)',
                        color: 'var(--monarch-success)',
                      }}
                    >
                      Recommended
                    </span>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {releases.stable.map((release) => (
                      <button
                        key={release.version}
                        onClick={() => setSelectedVersion(release.version)}
                        className={`w-full p-3 rounded-lg text-left transition-colors border ${
                          selectedVersion === release.version ? 'ring-2 ring-offset-1' : ''
                        }`}
                        style={{
                          backgroundColor: selectedVersion === release.version
                            ? 'var(--monarch-success-bg)'
                            : 'var(--monarch-bg-input)',
                          borderColor: selectedVersion === release.version
                            ? 'var(--monarch-success)'
                            : 'var(--monarch-border)',
                          '--tw-ring-color': 'var(--monarch-success)',
                          '--tw-ring-offset-color': 'var(--monarch-bg-card)',
                        } as React.CSSProperties}
                        disabled={release.is_current}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                              v{release.version}
                            </span>
                            {release.is_current && (
                              <span
                                className="text-xs px-1.5 py-0.5 rounded"
                                style={{
                                  backgroundColor: 'var(--monarch-bg-card)',
                                  color: 'var(--monarch-text-muted)',
                                }}
                              >
                                current
                              </span>
                            )}
                          </div>
                          {release.published_at && (
                            <span className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
                              {new Date(release.published_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Beta Releases */}
              {releases.beta.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                      Beta Releases
                    </h3>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: 'var(--monarch-accent-muted)',
                        color: 'var(--monarch-accent)',
                      }}
                    >
                      Preview
                    </span>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {releases.beta.map((release) => (
                      <button
                        key={release.version}
                        onClick={() => setSelectedVersion(release.version)}
                        className={`w-full p-3 rounded-lg text-left transition-colors border ${
                          selectedVersion === release.version ? 'ring-2 ring-offset-1' : ''
                        }`}
                        style={{
                          backgroundColor: selectedVersion === release.version
                            ? 'var(--monarch-accent-muted)'
                            : 'var(--monarch-bg-input)',
                          borderColor: selectedVersion === release.version
                            ? 'var(--monarch-accent)'
                            : 'var(--monarch-border)',
                          '--tw-ring-color': 'var(--monarch-accent)',
                          '--tw-ring-offset-color': 'var(--monarch-bg-card)',
                        } as React.CSSProperties}
                        disabled={release.is_current}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                              v{release.version}
                            </span>
                            {release.is_current && (
                              <span
                                className="text-xs px-1.5 py-0.5 rounded"
                                style={{
                                  backgroundColor: 'var(--monarch-bg-card)',
                                  color: 'var(--monarch-text-muted)',
                                }}
                              >
                                current
                              </span>
                            )}
                          </div>
                          {release.published_at && (
                            <span className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
                              {new Date(release.published_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Beta Warning */}
          {selectedVersion?.includes('-beta') && (
            <div
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: 'var(--monarch-warning-bg)',
                borderColor: 'var(--monarch-warning)',
              }}
            >
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 shrink-0 mt-0.5"
                  style={{ color: 'var(--monarch-warning)' }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div>
                  <div className="font-medium" style={{ color: 'var(--monarch-warning)' }}>
                    Beta Warning
                  </div>
                  <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
                    Beta releases may contain bugs and breaking changes.
                    Your data will be backed up automatically before any migration.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Update Instructions */}
          <div>
            <h3 className="font-medium mb-3">
              Steps to update{selectedVersion ? ` to v${selectedVersion}` : ''}
            </h3>
            <ol className="space-y-3">
              {updateInfo?.instructions.steps.map((step, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium"
                    style={{
                      backgroundColor: 'var(--monarch-accent)',
                      color: 'white',
                    }}
                  >
                    {index + 1}
                  </span>
                  <span className="pt-0.5">
                    {step.replace('VERSION', selectedVersion || 'X.Y.Z')}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* Docker Compose Example */}
          {updateInfo?.deployment_type === 'docker' && updateInfo?.instructions.example_compose && (
            <div>
              <h4 className="text-sm font-medium mb-2 opacity-70">docker-compose.yml</h4>
              <pre
                className="p-3 rounded-lg text-sm overflow-x-auto"
                style={{ backgroundColor: 'var(--monarch-bg-input)' }}
              >
                <code>
                  {updateInfo.instructions.example_compose.replace(
                    'VERSION',
                    selectedVersion || 'X.Y.Z'
                  )}
                </code>
              </pre>
            </div>
          )}

          {/* Railway Dashboard Link */}
          {updateInfo?.deployment_type === 'railway' && updateInfo?.instructions.project_url && (
            <a
              href={updateInfo.instructions.project_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full p-3 rounded-lg text-center font-medium transition-colors"
              style={{
                backgroundColor: 'var(--monarch-accent)',
                color: 'white',
              }}
            >
              Open Railway Dashboard
            </a>
          )}
        </div>
      )}
    </Modal>
  );
}
