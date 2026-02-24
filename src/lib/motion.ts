import type { Variants } from "framer-motion";
import type { BezierDefinition } from "framer-motion";

const easeOut: BezierDefinition = [0.16, 1, 0.3, 1];
const easeIn: BezierDefinition = [0.7, 0, 0.84, 0];
const easeInOut: BezierDefinition = [0.87, 0, 0.13, 1];

export const transitions = {
  fast: { duration: 0.1, ease: easeOut },
  normal: { duration: 0.2, ease: easeOut },
  smooth: { duration: 0.3, ease: easeOut },
  slow: { duration: 0.5, ease: easeOut },
  spring: { type: "spring" as const, stiffness: 300, damping: 30 },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitions.smooth },
  exit: { opacity: 0, transition: transitions.fast },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: transitions.smooth },
  exit: { opacity: 0, y: -8, transition: transitions.fast },
};

export const fadeDown: Variants = {
  hidden: { opacity: 0, y: -12 },
  visible: { opacity: 1, y: 0, transition: transitions.smooth },
  exit: { opacity: 0, y: 12, transition: transitions.fast },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: transitions.smooth },
  exit: { opacity: 0, scale: 0.95, transition: transitions.fast },
};

export const slideInLeft: Variants = {
  hidden: { x: -16, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: transitions.smooth },
  exit: { x: -16, opacity: 0, transition: transitions.fast },
};

export const slideInRight: Variants = {
  hidden: { x: 16, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: transitions.smooth },
  exit: { x: 16, opacity: 0, transition: transitions.fast },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: easeOut },
  },
};

export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: easeOut,
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

export { easeOut, easeIn, easeInOut };
