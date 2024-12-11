import { Switch, Route } from "wouter";
import { Shell } from "./components/Shell";
import Dashboard from "./pages/Dashboard";
import ContentGenerator from "./pages/ContentGenerator";
import Distribution from "./pages/Distribution";
import Analytics from "./pages/Analytics";

function App() {
  return (
    <Shell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/content" component={ContentGenerator} />
        <Route path="/distribution" component={Distribution} />
        <Route path="/analytics" component={Analytics} />
        <Route>404 Page Not Found</Route>
      </Switch>
    </Shell>
  );
}

export default App;
