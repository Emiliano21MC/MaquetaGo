import AuthScreen from "@/screens/AuthScreen";
import * as WebBrowser from "expo-web-browser";
WebBrowser.maybeCompleteAuthSession();
export default function SignUp() {
  return <AuthScreen signup />;
}
