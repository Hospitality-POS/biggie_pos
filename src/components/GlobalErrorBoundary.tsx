import { Component, ErrorInfo, ReactNode } from "react";
import * as Sentry from "@sentry/react";
import { Button, Result } from "antd";
import { ReloadOutlined, HomeOutlined } from "@ant-design/icons";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("GlobalErrorBoundary caught an error:", error, errorInfo);
    Sentry.captureReactException(error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh",
            background: "#f8f9fa",
            padding: 24,
          }}
        >
          <Result
            status="500"
            title="Something went wrong"
            subTitle={
              this.state.error?.message ||
              "An unexpected error occurred. Please refresh the page or return to the POS."
            }
            extra={[
              <Button
                type="primary"
                key="reload"
                icon={<ReloadOutlined />}
                onClick={this.handleReload}
                style={{ borderRadius: 8 }}
              >
                Refresh Page
              </Button>,
              <Button
                key="home"
                icon={<HomeOutlined />}
                onClick={this.handleGoHome}
                style={{ borderRadius: 8 }}
              >
                Return to POS
              </Button>,
            ]}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
