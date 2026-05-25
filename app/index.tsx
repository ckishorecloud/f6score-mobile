import { Redirect } from 'expo-router';

// Entry point: always go to splash first
export default function Index() {
  return <Redirect href="/splash" />;
}
