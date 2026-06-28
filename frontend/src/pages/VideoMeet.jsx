/* eslint-disable react-hooks/exhaustive-deps, no-unused-vars */
import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { Badge, IconButton, TextField } from '@mui/material';
import { Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import CallEndIcon from '@mui/icons-material/CallEnd';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import ChatIcon from '@mui/icons-material/Chat';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PeopleIcon from '@mui/icons-material/People';
import styles from '../styles/videoComponent.module.css';
import server from '../environment';
import { makePublicMeetingLink } from '../utils/publicLinks';

const server_url = server;
let connections = {};
let pendingIceCandidates = {};

const buildIceServers = () => {
    const servers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ];

    const turnUrl = process.env.REACT_APP_TURN_URL;
    if (turnUrl) {
        servers.push({
            urls: turnUrl,
            username: process.env.REACT_APP_TURN_USERNAME || '',
            credential: process.env.REACT_APP_TURN_CREDENTIAL || ''
        });
    }

    return servers;
};

const peerConfigConnections = {
    iceServers: buildIceServers(),
    iceCandidatePoolSize: 10
};

const getRoomName = () => window.location.pathname.replace(/^\//, '') || 'meeting-room';
const getRoomKey = () => `/${getRoomName()}`;
const getInviteLink = () => makePublicMeetingLink(getRoomName()) || window.location.href;

const isSecureMediaOrigin = () => {
    if (typeof window === 'undefined') return false;
    return window.isSecureContext || ['localhost', '127.0.0.1'].includes(window.location.hostname);
};

const stopStream = (stream) => {
    if (!stream) return;
    stream.getTracks().forEach((track) => track.stop());
};

const addLocalStreamToPeer = (peerConnection, stream) => {
    if (!peerConnection || !stream) return;

    stream.getTracks().forEach((track) => {
        const existingSender = peerConnection.getSenders().find(
            (sender) => sender.track && sender.track.kind === track.kind
        );

        if (existingSender) {
            existingSender.replaceTrack(track).catch((error) => console.log(error));
        } else {
            peerConnection.addTrack(track, stream);
        }
    });
};

const addOrUpdateRemoteVideo = (socketListId, stream, setVideos, videoRef) => {
    if (!stream) return;

    const videoExists = videoRef.current.find((video) => video.socketId === socketListId);

    if (videoExists) {
        setVideos((videos) => {
            const updatedVideos = videos.map((video) =>
                video.socketId === socketListId ? { ...video, stream } : video
            );
            videoRef.current = updatedVideos;
            return updatedVideos;
        });
    } else {
        const newVideo = {
            socketId: socketListId,
            stream,
            autoplay: true,
            playsinline: true
        };

        setVideos((videos) => {
            const updatedVideos = [...videos, newVideo];
            videoRef.current = updatedVideos;
            return updatedVideos;
        });
    }
};

export default function VideoMeetComponent() {
    const socketRef = useRef();
    const socketIdRef = useRef();
    const localVideoref = useRef();
    const videoRef = useRef([]);

    const [videoAvailable, setVideoAvailable] = useState(true);
    const [audioAvailable, setAudioAvailable] = useState(true);
    const [video, setVideo] = useState();
    const [audio, setAudio] = useState();
    const [screen, setScreen] = useState(false);
    const [screenAvailable, setScreenAvailable] = useState(false);
    const [showModal, setModal] = useState(false);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [newMessages, setNewMessages] = useState(0);
    const [askForUsername, setAskForUsername] = useState(true);
    const [username, setUsername] = useState('');
    const [videos, setVideos] = useState([]);
    const [copiedLink, setCopiedLink] = useState(false);
    const [participantCount, setParticipantCount] = useState(1);
    const [statusMessage, setStatusMessage] = useState('');
    const [mediaError, setMediaError] = useState('');
    const [socketError, setSocketError] = useState('');

    const roomInviteLink = getInviteLink();

    useEffect(() => {
        getPermissions();

        return () => {
            stopStream(window.localStream);
            Object.values(connections).forEach((connection) => connection && connection.close && connection.close());
            connections = {};
            pendingIceCandidates = {};
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, []);

    useEffect(() => {
        if (video !== undefined && audio !== undefined) {
            getUserMedia();
        }
    }, [video, audio]);

    useEffect(() => {
        if (screen) getDislayMedia();
    }, [screen]);

    const createPeerConnection = (socketListId) => {
        if (!socketListId || socketListId === socketIdRef.current) return null;
        if (connections[socketListId]) return connections[socketListId];

        const peerConnection = new RTCPeerConnection(peerConfigConnections);
        connections[socketListId] = peerConnection;

        peerConnection.onicecandidate = (event) => {
            if (event.candidate && socketRef.current) {
                socketRef.current.emit('signal', socketListId, JSON.stringify({ ice: event.candidate }));
            }
        };

        peerConnection.ontrack = (event) => {
            const remoteStream = event.streams && event.streams[0];
            addOrUpdateRemoteVideo(socketListId, remoteStream, setVideos, videoRef);
        };

        peerConnection.onconnectionstatechange = () => {
            if (['failed', 'closed', 'disconnected'].includes(peerConnection.connectionState)) {
                setVideos((currentVideos) => {
                    const updatedVideos = currentVideos.filter((item) => item.socketId !== socketListId);
                    videoRef.current = updatedVideos;
                    return updatedVideos;
                });
            }
        };

        if (window.localStream) addLocalStreamToPeer(peerConnection, window.localStream);

        return peerConnection;
    };

    const flushPendingCandidates = async (fromId) => {
        if (!pendingIceCandidates[fromId] || !connections[fromId]) return;

        for (const candidate of pendingIceCandidates[fromId]) {
            try {
                await connections[fromId].addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
                console.log(error);
            }
        }

        delete pendingIceCandidates[fromId];
    };

    const getPermissions = async () => {
        try {
            setMediaError('');

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setVideoAvailable(false);
                setAudioAvailable(false);
                setMediaError('Camera and microphone need HTTPS or localhost. Open the public HTTPS meeting link, then allow camera and microphone permission.');
                return;
            }

            if (!isSecureMediaOrigin()) {
                setMediaError('Camera and microphone are blocked on normal HTTP IP links. Use the public HTTPS meeting link for remote users.');
                return;
            }

            const devices = await navigator.mediaDevices.enumerateDevices();
            const hasVideo = devices.some((device) => device.kind === 'videoinput');
            const hasAudio = devices.some((device) => device.kind === 'audioinput');

            setVideoAvailable(hasVideo);
            setAudioAvailable(hasAudio);
            setScreenAvailable(Boolean(navigator.mediaDevices.getDisplayMedia));

            if (hasVideo || hasAudio) {
                const userMediaStream = await navigator.mediaDevices.getUserMedia({ video: hasVideo, audio: hasAudio });
                window.localStream = userMediaStream;
                if (localVideoref.current) localVideoref.current.srcObject = userMediaStream;
            }
        } catch (error) {
            console.log(error);
            setMediaError('Camera/microphone permission was blocked. Please allow camera and microphone from the browser permission popup.');
        }
    };

    const getMedia = () => {
        setVideo(videoAvailable);
        setAudio(audioAvailable);
        connectToSocketServer();
    };


    const renegotiateAllPeers = () => {
        Object.entries(connections).forEach(([id, peerConnection]) => {
            if (!peerConnection || id === socketIdRef.current) return;

            addLocalStreamToPeer(peerConnection, window.localStream);

            peerConnection.createOffer().then((description) => {
                peerConnection.setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ sdp: peerConnection.localDescription }));
                    })
                    .catch((e) => console.log(e));
            });
        });
    };

    const getUserMediaSuccess = (stream) => {
        try {
            stopStream(window.localStream);
        } catch (e) {
            console.log(e);
        }

        window.localStream = stream;
        if (localVideoref.current) localVideoref.current.srcObject = stream;

        renegotiateAllPeers();

        stream.getTracks().forEach((track) => {
            track.onended = () => {
                setVideo(false);
                setAudio(false);

                try {
                    stopStream(localVideoref.current.srcObject);
                } catch (e) {
                    console.log(e);
                }

                const blackSilence = (...args) => new MediaStream([black(...args), silence()]);
                window.localStream = blackSilence();
                if (localVideoref.current) localVideoref.current.srcObject = window.localStream;

                renegotiateAllPeers();
            };
        });
    };

    const getUserMedia = () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setMediaError('Camera and microphone need HTTPS or localhost. Open the public HTTPS meeting link.');
            return;
        }

        if ((video && videoAvailable) || (audio && audioAvailable)) {
            navigator.mediaDevices.getUserMedia({ video: Boolean(video && videoAvailable), audio: Boolean(audio && audioAvailable) })
                .then(getUserMediaSuccess)
                .catch((e) => {
                    console.log(e);
                    setMediaError('Unable to access camera/microphone. Please allow permission and refresh.');
                });
        } else {
            try {
                stopStream(localVideoref.current.srcObject);
            } catch (e) { }
        }
    };

    const getDislayMedia = () => {
        if (screen && navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
            navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                .then(getDislayMediaSuccess)
                .catch((e) => console.log(e));
        }
    };

    const getDislayMediaSuccess = (stream) => {
        try {
            stopStream(window.localStream);
        } catch (e) {
            console.log(e);
        }

        window.localStream = stream;
        if (localVideoref.current) localVideoref.current.srcObject = stream;

        renegotiateAllPeers();

        stream.getTracks().forEach((track) => {
            track.onended = () => {
                setScreen(false);
                getUserMedia();
            };
        });
    };

    const gotMessageFromServer = async (fromId, message) => {
        const signal = JSON.parse(message);
        if (fromId === socketIdRef.current) return;

        const peerConnection = createPeerConnection(fromId);
        if (!peerConnection) return;

        try {
            if (signal.sdp) {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                await flushPendingCandidates(fromId);

                if (signal.sdp.type === 'offer') {
                    const description = await peerConnection.createAnswer();
                    await peerConnection.setLocalDescription(description);
                    socketRef.current.emit('signal', fromId, JSON.stringify({ sdp: peerConnection.localDescription }));
                }
            }

            if (signal.ice) {
                if (peerConnection.remoteDescription) {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice));
                } else {
                    if (!pendingIceCandidates[fromId]) pendingIceCandidates[fromId] = [];
                    pendingIceCandidates[fromId].push(signal.ice);
                }
            }
        } catch (error) {
            console.log(error);
        }
    };

    const connectToSocketServer = () => {
        setStatusMessage('Connecting to meeting server...');
        setSocketError('');

        socketRef.current = io(server_url, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 8,
            timeout: 20000
        });

        socketRef.current.on('connect_error', (error) => {
            console.log(error);
            setSocketError(`Could not connect to meeting server: ${server_url}. Check backend/public tunnel URL.`);
            setStatusMessage('');
        });

        socketRef.current.on('signal', gotMessageFromServer);

        socketRef.current.on('connect', () => {
            setStatusMessage('Connected. Waiting for participant...');
            setSocketError('');
            socketIdRef.current = socketRef.current.id;
            socketRef.current.emit('join-call', getRoomKey());

            socketRef.current.on('chat-message', addMessage);

            socketRef.current.on('user-left', (id, clients = []) => {
                if (connections[id]) {
                    connections[id].close();
                    delete connections[id];
                }

                setVideos((currentVideos) => {
                    const updatedVideos = currentVideos.filter((item) => item.socketId !== id);
                    videoRef.current = updatedVideos;
                    return updatedVideos;
                });
                setParticipantCount(Math.max(clients.length, 1));
            });

            socketRef.current.on('user-joined', (id, clients = []) => {
                setParticipantCount(Math.max(clients.length, 1));

                clients.forEach((socketListId) => {
                    if (socketListId === socketIdRef.current) return;
                    createPeerConnection(socketListId);
                });

                if (id === socketIdRef.current) {
                    Object.keys(connections).forEach((id2) => {
                        if (id2 === socketIdRef.current) return;

                        const peerConnection = connections[id2];
                        if (!peerConnection) return;

                        addLocalStreamToPeer(peerConnection, window.localStream);

                        peerConnection.createOffer().then((description) => {
                            peerConnection.setLocalDescription(description)
                                .then(() => {
                                    socketRef.current.emit('signal', id2, JSON.stringify({ sdp: peerConnection.localDescription }));
                                })
                                .catch((e) => console.log(e));
                        });
                    });
                }
            });
        });
    };

    const silence = () => {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContextClass();
        const oscillator = ctx.createOscillator();
        const dst = oscillator.connect(ctx.createMediaStreamDestination());
        oscillator.start();
        ctx.resume();
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
    };

    const black = ({ width = 640, height = 480 } = {}) => {
        const canvas = Object.assign(document.createElement('canvas'), { width, height });
        canvas.getContext('2d').fillRect(0, 0, width, height);
        const stream = canvas.captureStream();
        return Object.assign(stream.getVideoTracks()[0], { enabled: false });
    };

    const handleVideo = () => setVideo(!video);
    const handleAudio = () => setAudio(!audio);
    const handleScreen = () => setScreen(!screen);

    const handleEndCall = () => {
        try {
            stopStream(localVideoref.current.srcObject);
        } catch (e) { }
        window.location.href = '/';
    };

    const addMessage = (data, sender, socketIdSender) => {
        setMessages((prevMessages) => [...prevMessages, { sender, data }]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages((prevNewMessages) => prevNewMessages + 1);
        }
    };

    const sendMessage = () => {
        if (!message.trim()) return;
        socketRef.current.emit('chat-message', message.trim(), username);
        setMessage('');
    };

    const copyInviteLink = async () => {
        try {
            await navigator.clipboard.writeText(roomInviteLink);
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 1800);
        } catch (error) {
            const input = document.createElement('input');
            input.value = roomInviteLink;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 1800);
        }
    };

    const connect = () => {
        setAskForUsername(false);
        getMedia();
    };

    return (
        <div>
            {askForUsername ? (
                <div className={styles.lobbyPage}>
                    <div className={styles.lobbyCard}>
                        <div className={styles.lobbyCopy}>
                            <span>Meeting Lobby</span>
                            <h2>Ready to join?</h2>
                            <p>Enter your display name, check your camera preview, and connect to the meeting room.</p>

                            <div className={styles.inviteBox}>
                                <label>Public invite link for this room</label>
                                <div>
                                    <input value={roomInviteLink} readOnly />
                                    <button type="button" onClick={copyInviteLink}>
                                        <ContentCopyIcon fontSize="small" /> {copiedLink ? 'Copied' : 'Copy'}
                                    </button>
                                </div>
                                <small>Share this exact HTTPS/public link with another participant. They can join from any network when your public frontend and backend are running.</small>
                            </div>

                            {mediaError && <div className={styles.errorBox}>{mediaError}</div>}

                            <div className={styles.lobbyForm}>
                                <TextField fullWidth label="Your name" value={username} onChange={(e) => setUsername(e.target.value)} variant="outlined" />
                                <Button variant="contained" size="large" onClick={connect} disabled={!username.trim()}>Connect</Button>
                            </div>
                        </div>
                        <div className={styles.lobbyPreview}>
                            <video ref={localVideoref} autoPlay muted playsInline></video>
                        </div>
                    </div>
                </div>
            ) : (
                <div className={styles.meetVideoContainer}>
                    <div className={styles.meetingTopBar}>
                        <div>
                            <span>Live Meeting</span>
                            <strong>{getRoomName()}</strong>
                        </div>
                        <div className={styles.meetingActions}>
                            <div className={styles.participantPill}><PeopleIcon fontSize="small" /> {participantCount}</div>
                            <button type="button" onClick={copyInviteLink}>
                                <ContentCopyIcon fontSize="small" /> {copiedLink ? 'Copied' : 'Copy invite link'}
                            </button>
                        </div>
                    </div>

                    {showModal && (
                        <div className={styles.chatRoom}>
                            <div className={styles.chatContainer}>
                                <div className={styles.chatHeader}>
                                    <h1>Meeting Chat</h1>
                                    <button type="button" onClick={() => setModal(false)}>×</button>
                                </div>
                                <div className={styles.chattingDisplay}>
                                    {messages.length !== 0 ? messages.map((item, index) => (
                                        <div style={{ marginBottom: '20px' }} key={index}>
                                            <p style={{ fontWeight: 'bold' }}>{item.sender}</p>
                                            <p>{item.data}</p>
                                        </div>
                                    )) : <p className={styles.noMessages}>No messages yet</p>}
                                </div>
                                <div className={styles.chattingArea}>
                                    <TextField value={message} onChange={(e) => setMessage(e.target.value)} label="Type a message" variant="outlined" />
                                    <Button variant="contained" onClick={sendMessage}>Send</Button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className={styles.buttonContainers}>
                        <IconButton onClick={handleVideo} style={{ color: 'white' }}>
                            {video ? <VideocamIcon /> : <VideocamOffIcon />}
                        </IconButton>
                        <IconButton onClick={handleEndCall} style={{ color: 'red' }}>
                            <CallEndIcon />
                        </IconButton>
                        <IconButton onClick={handleAudio} style={{ color: 'white' }}>
                            {audio ? <MicIcon /> : <MicOffIcon />}
                        </IconButton>
                        {screenAvailable && (
                            <IconButton onClick={handleScreen} style={{ color: 'white' }}>
                                {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                            </IconButton>
                        )}
                        <Badge badgeContent={newMessages} max={999} color="warning">
                            <IconButton
                                onClick={() => {
                                    setModal(!showModal);
                                    setNewMessages(0);
                                }}
                                style={{ color: 'white' }}
                            >
                                <ChatIcon />
                            </IconButton>
                        </Badge>
                    </div>

                    <video className={styles.meetUserVideo} ref={localVideoref} autoPlay muted playsInline></video>

                    <div className={styles.conferenceView}>
                        {videos.length === 0 && (
                            <div className={styles.waitingCard}>
                                <div className={styles.waitingIcon}>+</div>
                                <h2>Waiting for other participant</h2>
                                <p>Copy the public invite link and send it to your friend. When they open the same link and allow camera/microphone, their video will appear here.</p>
                                {statusMessage && <small>{statusMessage}</small>}
                                {socketError && <div className={styles.errorBox}>{socketError}</div>}
                                {mediaError && <div className={styles.errorBox}>{mediaError}</div>}
                                <button type="button" onClick={copyInviteLink}>
                                    <ContentCopyIcon fontSize="small" /> {copiedLink ? 'Copied' : 'Copy invite link'}
                                </button>
                            </div>
                        )}

                        {videos.map((videoItem) => (
                            <div key={videoItem.socketId} className={styles.remoteVideoCard}>
                                <video
                                    data-socket={videoItem.socketId}
                                    ref={(ref) => {
                                        if (ref && videoItem.stream) ref.srcObject = videoItem.stream;
                                    }}
                                    autoPlay
                                    playsInline
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
