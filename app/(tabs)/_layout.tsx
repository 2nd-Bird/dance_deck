import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import React from 'react';

// Simple fallback colors if constants/Colors is missing or complex, 
// but usually we can import if we trust the template.
// To be safe and fast, I will define colors here or use hardcoded.
const tintColorLight = '#2f95dc';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tintColorLight,
        headerShown: true,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Library',
          tabBarIcon: ({ color }) => <TabBarIcon name="film" color={color} />,
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          href: null, // Hide the second tab
        }}
      />
    </Tabs>
  );
}
