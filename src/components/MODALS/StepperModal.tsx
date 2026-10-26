import React from "react";
import { Modal, Steps, Space, Grid } from "antd";
import { THEME_C } from "@utils/getPrimaryColor";

const C = THEME_C;

export interface StepperModalStep {
    title: string;
    description?: string;
    icon?: React.ReactNode;
}

interface Props {
    open: boolean;
    onCancel: () => void;
    title: React.ReactNode;
    icon?: React.ReactNode;
    /** Accent colour for the header icon and active step. */
    accent?: string;
    steps: StepperModalStep[];
    current: number;
    /** Called when a step is clicked. Only steps before `current` are clickable. */
    onStepClick?: (index: number) => void;
    footer: React.ReactNode;
    width?: number;
    children: React.ReactNode;
}

/**
 * Modal shell for multi-step forms: vertical stepper on the left, step content
 * on the right. Collapses to a horizontal stepper on narrow screens.
 * Callers own the step state, validation and footer buttons.
 */
const StepperModal: React.FC<Props> = ({
    open, onCancel, title, icon, accent = C.primary, steps, current,
    onStepClick, footer, width = 900, children,
}) => {
    const screens = Grid.useBreakpoint();
    const vertical = screens.md !== false;

    const stepper = (
        <Steps
            direction={vertical ? "vertical" : "horizontal"}
            size="small"
            current={current}
            responsive={false}
            onChange={onStepClick ? (i) => { if (i < current) onStepClick(i); } : undefined}
            items={steps.map((s, i) => ({
                title: s.title,
                description: vertical ? s.description : undefined,
                icon: s.icon,
                disabled: !onStepClick || i >= current,
            }))}
        />
    );

    return (
        <Modal
            open={open}
            onCancel={onCancel}
            title={<Space>{icon && <span style={{ color: accent }}>{icon}</span>}{title}</Space>}
            width={width}
            footer={footer}
            destroyOnClose
            styles={{ body: { padding: 0 } }}
            style={{ top: 32 }}
        >
            <div style={{
                display: "flex", flexDirection: vertical ? "row" : "column",
                borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
                margin: "12px -24px 0",
            }}>
                <aside style={{
                    flex: vertical ? "0 0 210px" : "none",
                    background: C.bg,
                    borderRight: vertical ? `1px solid ${C.border}` : undefined,
                    borderBottom: vertical ? undefined : `1px solid ${C.border}`,
                    padding: vertical ? "20px 16px" : "12px 16px",
                    overflowX: vertical ? undefined : "auto",
                }}>
                    {stepper}
                </aside>
                <section style={{
                    flex: 1, minWidth: 0,
                    padding: "20px 24px",
                    maxHeight: "calc(100vh - 220px)", overflowY: "auto",
                }}>
                    {children}
                </section>
            </div>
        </Modal>
    );
};

export default StepperModal;
