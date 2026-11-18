"use client";

import { Component, cloneElement, isValidElement } from "react";

/**
 * An error boundary for one part of the page (the embedded shell, the egg, the terminal): if it
 * throws while rendering, `fallback` shows in its place and the rest of the page stays up. The
 * route's own error.js (src/app/error.js) catches whatever this doesn't. Render errors only: a
 * throw in an event handler or a timer never reaches a boundary. React itself reports the caught
 * error to the console, so this doesn't log it again; it keeps it in `state.error`. A fallback
 * element gets an `onRetry` that clears the failure and renders the children again.
 */
export default class Isolate extends Component {
  state = { failed: false, error: null };

  static getDerivedStateFromError(error) {
    return { failed: true, error };
  }

  retry = () => this.setState({ failed: false, error: null });

  render() {
    if (!this.state.failed) return this.props.children;
    const { fallback } = this.props;
    return isValidElement(fallback) ? cloneElement(fallback, { onRetry: this.retry }) : fallback;
  }
}
