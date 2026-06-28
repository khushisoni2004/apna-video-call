import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { AuthContext } from '../contexts/AuthContext';
import { Snackbar, Alert } from '@mui/material';
import '../App.css';

const defaultTheme = createTheme({
  palette: {
    primary: { main: '#2563eb' },
    secondary: { main: '#7c3aed' }
  },
  shape: { borderRadius: 14 }
});

export default function Authentication() {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [error, setError] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [formState, setFormState] = React.useState(0);
  const [open, setOpen] = React.useState(false);

  const { handleRegister, handleLogin } = React.useContext(AuthContext);

  const handleAuth = async () => {
    try {
      setError('');
      if (formState === 0) {
        await handleLogin(username, password);
      } else {
        const result = await handleRegister(name, username, password);
        setUsername('');
        setName('');
        setPassword('');
        setMessage(result);
        setOpen(true);
        setFormState(0);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to complete request. Please try again.');
    }
  };

  return (
    <ThemeProvider theme={defaultTheme}>
      <Grid container component="main" sx={{ minHeight: '100vh' }} className="authPage">
        <CssBaseline />
        <Grid item xs={false} sm={5} md={7} className="authHero">
          <div className="authHeroContent">
            <div className="brandBlock">
              <div className="brandIcon">A</div>
              <div>
                <h2>Apna Video Call</h2>
                <span>Professional video meetings</span>
              </div>
            </div>
            <h1>Meet, present and collaborate from anywhere.</h1>
            <p>Secure login, instant rooms, realtime chat, screen sharing and meeting history in a clean dashboard.</p>
          </div>
        </Grid>

        <Grid item xs={12} sm={7} md={5} component={Paper} elevation={0} square className="authPanel">
          <Box className="authCard">
            <Avatar sx={{ m: 1, bgcolor: 'primary.main', width: 58, height: 58 }}>
              <LockOutlinedIcon />
            </Avatar>
            <Typography component="h1" variant="h4" fontWeight={800}>
              {formState === 0 ? 'Welcome back' : 'Create account'}
            </Typography>
            <Typography color="text.secondary" textAlign="center" sx={{ mt: 1 }}>
              {formState === 0 ? 'Login with your username or email.' : 'Create your account to save meeting history.'}
            </Typography>

            <div className="authTabs">
              <Button variant={formState === 0 ? 'contained' : 'text'} onClick={() => setFormState(0)}>Sign In</Button>
              <Button variant={formState === 1 ? 'contained' : 'text'} onClick={() => setFormState(1)}>Sign Up</Button>
            </div>

            <Box component="form" noValidate sx={{ mt: 2, width: '100%' }}>
              {formState === 1 && (
                <TextField margin="normal" required fullWidth label="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
              )}
              <TextField margin="normal" required fullWidth label="Username or Email" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
              <TextField margin="normal" required fullWidth label="Password" value={password} type="password" onChange={(e) => setPassword(e.target.value)} />

              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

              <Button type="button" fullWidth variant="contained" size="large" sx={{ mt: 3, mb: 2, py: 1.3 }} onClick={handleAuth}>
                {formState === 0 ? 'Login' : 'Register'}
              </Button>
            </Box>
          </Box>
        </Grid>
      </Grid>

      <Snackbar open={open} autoHideDuration={4000} onClose={() => setOpen(false)} message={message} />
    </ThemeProvider>
  );
}
