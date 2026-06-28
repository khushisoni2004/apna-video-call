import React, { useContext, useMemo, useState } from 'react';
import withAuth from '../utils/withAuth';
import { useNavigate } from 'react-router-dom';
import '../App.css';

import { Button, IconButton, TextField, Tooltip } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import LogoutIcon from '@mui/icons-material/Logout';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PublicIcon from '@mui/icons-material/Public';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';

import { AuthContext } from '../contexts/AuthContext';
import {
  cleanBaseUrl,
  getPublicFrontendUrl,
  savePublicFrontendUrl,
  isLocalOrigin
} from '../utils/publicLinks';

function HomeComponent() {
  const navigate = useNavigate();
  const { addToUserHistory } = useContext(AuthContext);

  const [meetingCode, setMeetingCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [publicFrontendUrl, setPublicFrontendUrl] = useState(getPublicFrontendUrl());

  const isLocal = isLocalOrigin(window.location.origin);
  const hasPublicUrl = publicFrontendUrl && !isLocalOrigin(publicFrontendUrl);

  const publicInviteLink = useMemo(() => {
    const code = meetingCode.trim();
    if (!code) return '';

    const preferredBase = cleanBaseUrl(publicFrontendUrl);
    const safeBase =
      preferredBase && !isLocalOrigin(preferredBase)
        ? preferredBase
        : getPublicFrontendUrl();

    return safeBase ? `${safeBase}/${code}` : '';
  }, [meetingCode, publicFrontendUrl]);

  const makeMeetingCode = () => {
    const code = `meet-${Math.random().toString(36).slice(2, 8)}`;
    setMeetingCode(code);
    setCopied(false);
  };

  const handleSavePublicUrl = () => {
    const clean = savePublicFrontendUrl(publicFrontendUrl);
    setPublicFrontendUrl(clean);
  };

  const copyInviteLink = async () => {
    if (!publicInviteLink) return;
    try {
      await navigator.clipboard.writeText(publicInviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const handleJoinVideoCall = async () => {
    const code = meetingCode.trim();
    if (!code) return;

    try {
      await addToUserHistory(code);
    } catch {
      // Meeting can still open.
    }

    navigate(`/${code}`);
  };

  const openPublicMeeting = () => {
    if (!publicInviteLink) return;
    window.open(publicInviteLink, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="homeNovaPage">
      <span className="homeNovaGlow homeNovaGlowOne"></span>
      <span className="homeNovaGlow homeNovaGlowTwo"></span>
      <span className="homeNovaPattern"></span>

      <nav className="homeNovaNav">
        <div className="homeNovaBrand">
          <div className="homeNovaLogo">A</div>
          <div>
            <h2>Apna Video Call</h2>
            <span>Smart collaboration space</span>
          </div>
        </div>

        <div className="homeNovaNavActions">
          <Tooltip title="Meeting History">
            <IconButton onClick={() => navigate('/history')}>
              <RestoreIcon />
            </IconButton>
          </Tooltip>

          <Button onClick={() => navigate('/history')}>History</Button>

          <Button
            startIcon={<LogoutIcon />}
            onClick={() => {
              localStorage.removeItem('token');
              navigate('/auth');
            }}
          >
            Logout
          </Button>
        </div>
      </nav>

      <main className="homeNovaMain">
        <section className="homeNovaLeft">
          <div className="homeNovaBadge">
            <AutoAwesomeIcon fontSize="small" />
            Elegant video meetings
          </div>

          <h1>Bring people together, beautifully.</h1>

          <p>
            Start secure meetings, share a single invite link, and collaborate
            smoothly with chat, screen share and saved room history.
          </p>

          <div className="homeNovaFeatureRow">
            <div>
              <VideoCallIcon />
              <span>HD calls</span>
            </div>
            <div>
              <ForumRoundedIcon />
              <span>Live chat</span>
            </div>
            <div>
              <ShieldRoundedIcon />
              <span>Secure access</span>
            </div>
          </div>

          {isLocal && (
            <div className="homeNovaUrlBox">
              <div className="homeNovaUrlHead">
                <CheckCircleIcon />
                <span>
                  {hasPublicUrl ? 'Public frontend URL saved' : 'Paste frontend tunnel URL once'}
                </span>
              </div>

              <div className="homeNovaUrlRow">
                <TextField
                  value={publicFrontendUrl}
                  onChange={(e) => setPublicFrontendUrl(e.target.value)}
                  placeholder="https://your-frontend.trycloudflare.com"
                  size="small"
                  fullWidth
                />
                <Button variant="outlined" onClick={handleSavePublicUrl}>
                  Save
                </Button>
              </div>
            </div>
          )}

          <div className="homeNovaJoinRow">
            <TextField
              value={meetingCode}
              onChange={(e) => {
                setMeetingCode(e.target.value.trim());
                setCopied(false);
              }}
              label="Meeting Code"
              placeholder="meet-khushi"
              fullWidth
            />

            <Button
              variant="contained"
              startIcon={<VideoCallIcon />}
              onClick={handleJoinVideoCall}
              disabled={!meetingCode.trim()}
            >
              Join
            </Button>
          </div>

          <div className="homeNovaActionGrid">
            <Button variant="outlined" startIcon={<AddIcon />} onClick={makeMeetingCode}>
              New Meeting
            </Button>

            <Button
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              onClick={handleJoinVideoCall}
              disabled={!meetingCode.trim()}
            >
              Start Now
            </Button>
          </div>

          {meetingCode.trim() && (
            <div className="homeNovaInviteBox">
              <div className="homeNovaInviteTop">
                <div>
                  <span>Shareable invite link</span>
                  <strong>{meetingCode.trim()}</strong>
                </div>
                <PublicIcon />
              </div>

              <input value={publicInviteLink} readOnly />

              <div className="homeNovaInviteActions">
                <Button
                  variant="outlined"
                  startIcon={<ContentCopyIcon />}
                  onClick={copyInviteLink}
                >
                  {copied ? 'Copied' : 'Copy Link'}
                </Button>

                <Button
                  variant="contained"
                  startIcon={<VideoCallIcon />}
                  onClick={openPublicMeeting}
                  disabled={!publicInviteLink}
                >
                  Open Link
                </Button>
              </div>
            </div>
          )}
        </section>

        <section className="homeNovaRight">
          <div className="homeNovaVisualWrap">
            <div className="homeNovaFloating homeNovaFloatingOne">
              <VideoCallIcon />
              <span>Live HD Room</span>
            </div>

            <div className="homeNovaFloating homeNovaFloatingTwo">
              <GroupsRoundedIcon />
              <span>Invite anyone</span>
            </div>

            <div className="homeNovaVisualCard">
              <div className="homeNovaVisualHeader">
                <div className="homeNovaDots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <small>Video collaboration preview</small>
              </div>

              <div className="homeNovaIllustration">
                <div className="homeNovaBigScreen">
                  <div className="homeNovaPerson main">
                    <i></i>
                    <b>Host</b>
                  </div>
                </div>

                <div className="homeNovaSmallColumn">
                  <div className="homeNovaMiniScreen">
                    <div className="homeNovaPerson">
                      <i></i>
                      <b>Guest 1</b>
                    </div>
                  </div>

                  <div className="homeNovaMiniScreen">
                    <div className="homeNovaPerson">
                      <i></i>
                      <b>Guest 2</b>
                    </div>
                  </div>
                </div>

                <div className="homeNovaChatCard">
                  <div className="homeNovaChatBubble one"></div>
                  <div className="homeNovaChatBubble two"></div>
                  <div className="homeNovaChatBubble three"></div>
                </div>
              </div>

              <div className="homeNovaControlBar">
                <span></span>
                <span></span>
                <span className="danger"></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default withAuth(HomeComponent);
