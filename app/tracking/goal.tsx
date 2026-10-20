import React from 'react';
import { router, Stack } from 'expo-router';
import GoalScreen from '../(tabs)/goal';
export default function TrackingGoalScreen() { return <><Stack.Screen options={{headerShown:false,statusBarStyle:'dark'}}/><GoalScreen onBack={() => router.back()}/></>; }
