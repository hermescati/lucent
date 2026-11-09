import { Host } from '@expo/ui/swift-ui';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

/** A SwiftUI host filling the page, for forms, lists and navigation, which size themselves to the screen. */
export const Fill = ({ children }: { children: ReactNode }) => <Host style={StyleSheet.absoluteFill}>{children}</Host>;
