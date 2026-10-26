import { useState } from "react";
import type { FormInstance } from "antd";
import { Button, Grid, Steps, Typography } from "antd";
import { ArrowLeftOutlined, ArrowRightOutlined, SaveOutlined } from "@ant-design/icons";
import { THEME_C } from "@utils/getPrimaryColor";

const { Text } = Typography;
const C = THEME_C;

/**
 * Multi-step modal forms (lead, campaign, sales target).
 *
 * All steps live in one antd <Form>. Inactive steps stay mounted but hidden
 * (stepStyle) so their values and rules are kept and validated on submit.
 * `fields` on each step are validated before moving past it, and used to jump
 * back to the step holding the first error when a submit fails.
 */
export interface FormStep {
    title: string;
    description: string;
    icon: React.ReactNode;
    fields: string[];
}

export const useFormSteps = (form: FormInstance, steps: FormStep[]) => {
    const [current, setCurrent] = useState(0);
    const isLastStep = current === steps.length - 1;

    // Validate the steps between the current one and `target` before moving
    // forward; going back is always allowed.
    const goToStep = async (target: number) => {
        if (target <= current) {
            setCurrent(target);
            return;
        }
        for (let i = current; i < target; i++) {
            try {
                await form.validateFields(steps[i].fields);
            } catch {
                setCurrent(i);
                return;
            }
        }
        setCurrent(target);
    };

    // Pass to <Form onFinishFailed> — jump to the first step with an error
    const onFinishFailed = ({ errorFields }: any) => {
        const firstName = errorFields?.[0]?.name?.[0];
        const stepIndex = steps.findIndex(s => s.fields.includes(firstName));
        if (stepIndex >= 0) setCurrent(stepIndex);
    };

    // Pass to <Form onKeyDown> — Enter in a text input moves to the next
    // step instead of submitting the whole form early
    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !isLastStep && (e.target as HTMLElement).tagName === "INPUT") {
            e.preventDefault();
            goToStep(current + 1);
        }
    };

    const stepStyle = (index: number): React.CSSProperties =>
        index === current ? {} : { display: "none" };

    return { current, setCurrent, isLastStep, goToStep, onFinishFailed, onKeyDown, stepStyle };
};

interface StepFormLayoutProps {
    steps: FormStep[];
    current: number;
    onStepChange: (index: number) => void;
    children: React.ReactNode;
    footer: React.ReactNode;
}

/**
 * Stepper on the left (on top on phones), current step's title, the step
 * content and a footer. Render it inside the <Form>; the modal body should
 * have no padding.
 */
export const StepFormLayout: React.FC<StepFormLayoutProps> = ({
    steps, current, onStepChange, children, footer,
}) => {
    const screens = Grid.useBreakpoint();
    const sideStepper = !!screens.md;

    return (
        <div style={{ display: "flex", flexDirection: sideStepper ? "row" : "column", minHeight: sideStepper ? 460 : undefined }}>
            <div style={sideStepper
                ? { width: 220, flexShrink: 0, padding: "20px 16px", borderRight: `1px solid ${C.border}`, background: C.bg }
                : { padding: "12px 16px 0" }}>
                <Steps
                    direction={sideStepper ? "vertical" : "horizontal"}
                    size="small"
                    current={current}
                    onChange={onStepChange}
                    responsive={false}
                    items={steps.map(s => ({
                        title: s.title,
                        description: sideStepper ? s.description : undefined,
                        icon: s.icon,
                    }))}
                />
            </div>

            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                <div style={{ flex: 1, padding: "20px 24px 8px", maxHeight: "70vh", overflowY: "auto" }}>
                    <Text strong style={{ fontSize: 15, color: C.darkText, display: "block" }}>
                        {steps[current].title}
                    </Text>
                    <Text style={{ fontSize: 12, color: C.subText, display: "block", marginBottom: 16 }}>
                        Step {current + 1} of {steps.length} · {steps[current].description}
                    </Text>
                    {children}
                </div>
                <div style={{
                    display: "flex", justifyContent: "space-between", gap: 10,
                    padding: "12px 24px 20px", borderTop: `1px solid ${C.border}`,
                }}>
                    {footer}
                </div>
            </div>
        </div>
    );
};

interface StepFormFooterProps {
    current: number;
    isLastStep: boolean;
    isEdit: boolean;
    loading: boolean;
    submitLabel: string;
    onCancel: () => void;
    onBack: () => void;
    onNext: () => void;
    onSubmit: () => void;
}

/**
 * Cancel/Back on the left; Next, or the submit button on the last step, on
 * the right. When editing, "Save" is offered on every step.
 *
 * Buttons submit via onSubmit (form.submit()) rather than htmlType="submit":
 * "Next" turns into the submit button in the same spot while its click is
 * still being handled, and a submit-type button there would save the record
 * instead of opening the last step. Separate keys keep them as different
 * DOM nodes.
 */
export const StepFormFooter: React.FC<StepFormFooterProps> = ({
    current, isLastStep, isEdit, loading, submitLabel, onCancel, onBack, onNext, onSubmit,
}) => {
    const primaryStyle = { background: C.primary, borderColor: C.primary, borderRadius: 8, height: 38, fontWeight: 500 };
    return (
        <>
            {current === 0 ? (
                <Button key="cancel" onClick={onCancel} disabled={loading} style={{ borderRadius: 8, height: 38 }}>
                    Cancel
                </Button>
            ) : (
                <Button key="back" icon={<ArrowLeftOutlined />} onClick={onBack}
                    disabled={loading} style={{ borderRadius: 8, height: 38 }}>
                    Back
                </Button>
            )}
            <div style={{ display: "flex", gap: 10 }}>
                {isEdit && !isLastStep && (
                    <Button key="save" icon={<SaveOutlined />} loading={loading} onClick={onSubmit}
                        style={{ borderRadius: 8, height: 38 }}>
                        Save
                    </Button>
                )}
                {isLastStep ? (
                    <Button key="submit" type="primary" icon={<SaveOutlined />} loading={loading}
                        onClick={onSubmit} style={primaryStyle}>
                        {submitLabel}
                    </Button>
                ) : (
                    <Button key="next" type="primary" onClick={onNext} style={primaryStyle}>
                        Next <ArrowRightOutlined />
                    </Button>
                )}
            </div>
        </>
    );
};
