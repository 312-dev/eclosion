/**
 * StepIndicator - Visual progress indicator for wizard steps
 */

interface Step {
  id: string;
  title: string;
}

interface StepIndicatorProps {
  readonly steps: Step[];
  readonly currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300"
            style={{
              backgroundColor: index <= currentStep ? 'var(--monarch-orange)' : 'var(--monarch-bg-page)',
              color: index <= currentStep ? 'white' : 'var(--monarch-text-muted)',
              border: index === currentStep ? '2px solid var(--monarch-orange)' : '1px solid var(--monarch-border)',
              transform: index === currentStep ? 'scale(1.1)' : 'scale(1)',
            }}
          >
            {index + 1}
          </div>
          {index < steps.length - 1 && (
            <div
              className="w-6 h-0.5 transition-colors duration-300"
              style={{
                backgroundColor: index < currentStep ? 'var(--monarch-orange)' : 'var(--monarch-border)',
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export const SETUP_WIZARD_STEPS: Step[] = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'category', title: 'Category' },
  { id: 'items', title: 'Items' },
  { id: 'rollup', title: 'Rollup' },
  { id: 'finish', title: 'Finish' },
];
