import { Component } from 'react';
import type { ReactNode } from 'react';
export class FactoryBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; onFailure: (error: unknown) => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    this.props.onFailure(error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
