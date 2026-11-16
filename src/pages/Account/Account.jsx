import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { KeyRound, UserRound } from 'lucide-react';
import { authApi } from '@api/endpoints';
import { tokenRefreshed, userUpdated } from '@store/authSlice';
import { fullName } from '@helpers/format';
import { toast } from '@helpers/toast';
import { Avatar, Badge, Button, Card, Field, PageHeader } from '@components';
import { ROLE_LABELS } from '@data/roles';

const Account = () => {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const [profile, setProfile] = useState({ firstName: user.firstName, lastName: user.lastName, phone: user.phone ?? '' });
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirm: '' });

  const saveProfile = async () => {
    try {
      dispatch(userUpdated(await authApi.updateMe(profile)));
      toast.success('Profile saved');
    } catch (err) { toast.error(err); }
  };
  const savePassword = async () => {
    try {
      const { token } = await authApi.changePassword(pwd.currentPassword, pwd.newPassword);
      dispatch(tokenRefreshed(token));
      setPwd({ currentPassword: '', newPassword: '', confirm: '' });
      toast.success('Password changed');
    } catch (err) { toast.error(err); }
  };

  return (
    <>
      <PageHeader title="My account" />
      <div className="row g-3">
        <div className="col-lg-6">
          <Card title="Profile" icon={UserRound}>
            <div className="d-flex align-items-center gap-3 mb-3">
              <Avatar person={user} size={56} color="#064CA5" />
              <div>
                <div className="fw-800 fs-15">{fullName(user)}</div>
                <div className="fg-muted fs-13">{user.email}</div>
                <div className="d-flex gap-1 mt-1">{user.roles.map((r) => <Badge key={r} tone="purple">{ROLE_LABELS[r]}</Badge>)}</div>
              </div>
            </div>
            <div className="row">
              <div className="col-6"><Field label="First name"><input className="form-control" value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} /></Field></div>
              <div className="col-6"><Field label="Last name"><input className="form-control" value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} /></Field></div>
              <div className="col-12"><Field label="Phone"><input className="form-control" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></Field></div>
            </div>
            <Button onClick={saveProfile}>Save</Button>
          </Card>
        </div>
        <div className="col-lg-6">
          <Card title="Password" icon={KeyRound}>
            <Field label="Current password"><input type="password" className="form-control" value={pwd.currentPassword} onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })} /></Field>
            <Field label="New password" hint="At least 8 characters"><input type="password" className="form-control" value={pwd.newPassword} onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })} /></Field>
            <Field label="Repeat new password" error={pwd.confirm && pwd.confirm !== pwd.newPassword ? "Passwords don't match" : undefined}><input type="password" className="form-control" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} /></Field>
            <Button disabled={!pwd.currentPassword || pwd.newPassword.length < 8 || pwd.newPassword !== pwd.confirm} onClick={savePassword}>Change password</Button>
          </Card>
        </div>
      </div>
    </>
  );
};

export default Account;
