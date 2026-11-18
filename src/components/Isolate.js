"use client";

import { Component } from "react";

/**
 * An error boundary for one part of the page (the embedded shell, the egg, the terminal): if it
 * throws while rendering, `fallback` shows in its place and the rest of the page stays up. The
 * route's own error.js (src/app/error.js) catches whatever this doesn't. Render errors only: a
 * throw in an event handler or a timer never reaches a boundary.
 */
export default class Isolate extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
