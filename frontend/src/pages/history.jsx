import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import HomeIcon from '@mui/icons-material/Home';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import { IconButton } from '@mui/material';
import '../App.css';

export default function History() {
  const { getHistoryOfUser } = useContext(AuthContext);
  const [meetings, setMeetings] = useState([]);
  const routeTo = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const history = await getHistoryOfUser();
        setMeetings(Array.isArray(history) ? history : []);
      } catch {
        setMeetings([]);
      }
    };
    fetchHistory();
  }, [getHistoryOfUser]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Not available';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="historyPage">
      <div className="historyHeader">
        <div>
          <h1>Meeting History</h1>
          <p>Quickly rejoin your previously used meeting rooms.</p>
        </div>
        <IconButton onClick={() => routeTo('/home')} className="homeIconButton">
          <HomeIcon />
        </IconButton>
      </div>

      <div className="historyGrid">
        {meetings.length !== 0 ? meetings.map((e, i) => (
          <Card key={e._id || i} variant="outlined" className="historyCard">
            <CardContent>
              <div className="historyCardTop">
                <VideoCallIcon />
                <span>Room</span>
              </div>
              <Typography variant="h6" fontWeight={800}>Code: {e.meetingCode}</Typography>
              <Typography sx={{ mb: 2 }} color="text.secondary">Date: {formatDate(e.date)}</Typography>
              <Button variant="contained" onClick={() => routeTo(`/${e.meetingCode}`)}>Rejoin</Button>
            </CardContent>
          </Card>
        )) : (
          <div className="emptyHistory">
            <h2>No meeting history yet</h2>
            <p>Join your first meeting and it will appear here.</p>
            <Button variant="contained" onClick={() => routeTo('/home')}>Go to Dashboard</Button>
          </div>
        )}
      </div>
    </div>
  );
}
