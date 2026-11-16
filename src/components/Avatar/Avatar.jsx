import { colorFor, fullName, initials } from '@helpers/format';
import styles from './Avatar.module.scss';

const Avatar = ({ person, size = 36, color }) => (
  <span
    className={styles.avatar}
    style={{ width: size, height: size, fontSize: size * 0.36, '--c': color ?? colorFor(fullName(person)) }}
    title={fullName(person)}
  >
    {initials(person)}
  </span>
);

export default Avatar;
