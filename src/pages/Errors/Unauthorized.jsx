import { Link } from 'react-router';
import { ShieldAlert } from 'lucide-react';
import { EmptyState, Button } from '@components';

const Unauthorized = () => (
  <EmptyState
    icon={ShieldAlert}
    title="You don't have access to this page"
    message="Your role doesn't allow it. Ask the school manager if you need access."
    action={<Link to="/"><Button variant="soft">Back to home</Button></Link>}
  />
);

export default Unauthorized;
