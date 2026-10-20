import React from 'react';
import { RefreshControl, type RefreshControlProps } from 'react-native';
import { AppTheme } from '../../constants/AppTheme';

export function AppRefreshControl(props: RefreshControlProps) {
  return <RefreshControl {...props} tintColor={AppTheme.yellow} colors={[AppTheme.yellow]} progressBackgroundColor={AppTheme.surface} />;
}
