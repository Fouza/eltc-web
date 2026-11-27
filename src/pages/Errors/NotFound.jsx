import { Link } from 'react-router';
import { Compass } from 'lucide-react';
import { EmptyState, Button } from '@components';

const NotFound = () => (
  <EmptyState icon={Compass} title="Page not found" message="This page doesn't exist or was moved." action={<Link to="/"><Button variant="soft">Back to home</Button></Link>} />
);

export default NotFound;
