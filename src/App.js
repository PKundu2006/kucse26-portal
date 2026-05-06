// This is the main file that runs your website. 
// It handles Login, File Selection, and Uploading to the cloud.

import React, { useState, useEffect } from 'react';
import { auth, googleProvider, db, storage } from './firebase-config';
import { signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, getDocs, doc, setDoc } from 'firebase/firestore';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('files');
  const [visibility, setVisibility] = useState('public');
  const [chatMessages, setChatMessages] = useState([
    { author: 'System', text: 'Welcome to the KU CSE group chat!', time: new Date() },
    { author: 'Admin', text: 'Use the Upload tab to share public or private files.', time: new Date() }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const [userBio, setUserBio] = useState('');
  const [savedItems, setSavedItems] = useState([]);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isViewingProfile, setIsViewingProfile] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [signUpType, setSignUpType] = useState('student');
  const [discipline, setDiscipline] = useState('');
  const [studentId, setStudentId] = useState('');
  const [batch, setBatch] = useState('');
  const [authError, setAuthError] = useState('');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [currentAddress, setCurrentAddress] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [college, setCollege] = useState('');
  const [school, setSchool] = useState('');

  const tabs = [
    { key: 'files', label: 'Uploaded Files' },
    { key: 'upload', label: 'Upload' },
    { key: 'chat', label: 'Chat' },
    { key: 'saved', label: 'Saved Items' },
    { key: 'team', label: 'Team Behind' }
  ];

  // 1. Check if user is already logged in
  useEffect(() => {
    onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchFiles();
        fetchUserProfile(currentUser.uid);
      }
    });
  }, []);

  // Fetch user profile data from Firestore
  const fetchUserProfile = async (uid) => {
    try {
      const userDoc = await getDocs(collection(db, 'users'));
      const userData = userDoc.docs.find(doc => doc.id === uid);
      if (userData) {
        const data = userData.data();
        setUserRole(data.role || '');
        setDiscipline(data.discipline || '');
        setStudentId(data.studentId || '');
        setBatch(data.batch || '');
        setHomeAddress(data.homeAddress || '');
        setCurrentAddress(data.currentAddress || '');
        setMobileNo(data.mobileNo || '');
        setCollege(data.college || '');
        setSchool(data.school || '');
        setUserBio(data.bio || '');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // 2. Login/Logout Functions
  const handleLogin = () => signInWithPopup(auth, googleProvider);
  const handleLogout = () => signOut(auth);

  const handleEmailSignIn = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setAuthError('');
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleEmailSignUp = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: userName });
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        displayName: userName,
        email,
        role: signUpType,
        discipline,
        studentId: signUpType === 'student' ? studentId : '',
        batch: signUpType === 'student' ? batch : '',
        createdAt: new Date()
      });
      setAuthError('');
    } catch (error) {
      setAuthError(error.message);
    }
  };

  // 3. Fetch list of uploaded files from Database
  const fetchFiles = async () => {
    const querySnapshot = await getDocs(collection(db, 'files'));
    const files = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setFileList(files);
  };

  // 4. Upload Function
  const handleUpload = async () => {
    if (!file) {
      setMessage({ type: 'error', text: 'Please select a file first!' });
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    setUploading(true);
    setMessage('');

    try {
      // Upload file to Firebase Storage
      const storageRef = ref(storage, `uploads/${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      // Save file link and user info to Firestore Database
      await addDoc(collection(db, 'files'), {
        fileName: file.name,
        fileUrl: url,
        uploadedBy: user.displayName,
        visibility,
        timestamp: new Date()
      });

      setMessage({ type: 'success', text: 'Upload successful! 🚀' });
      setFile(null);
      setVisibility('public');
      fetchFiles(); // Refresh the list
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Upload error:", error);
      setMessage({ type: 'error', text: 'Upload failed. Please try again.' });
    }
    setUploading(false);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    setChatMessages((prev) => [
      ...prev,
      { author: user.displayName, text: chatInput.trim(), time: new Date() }
    ]);
    setChatInput('');
  };

  const visibleFiles = fileList.filter((f) => {
    const fileVisibility = f.visibility || 'public';
    return fileVisibility === 'public' || f.uploadedBy === user.displayName;
  });

  const handleProfilePictureUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    try {
      await setDoc(doc(db, 'users', user.uid), {
        displayName: user.displayName,
        email: user.email,
        role: userRole,
        discipline,
        studentId: userRole === 'student' ? studentId : '',
        batch: userRole === 'student' ? batch : '',
        homeAddress,
        currentAddress,
        mobileNo,
        college: userRole === 'student' ? college : '',
        school: userRole === 'student' ? school : '',
        bio: userBio,
        updatedAt: new Date()
      }, { merge: true });
      setIsEditingProfile(false);
      setIsViewingProfile(false);
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const handleConfirmLogout = async () => {
    setShowLogoutConfirm(false);
    setProfileOpen(false);
    await handleLogout();
  };

  const handleSaveFile = (fileId) => {
    if (!savedItems.find(item => item.id === fileId)) {
      const file = fileList.find(f => f.id === fileId);
      if (file) {
        setSavedItems((prev) => [...prev, file]);
      }
    }
  };

  const handleRemoveSavedFile = (fileId) => {
    setSavedItems((prev) => prev.filter(item => item.id !== fileId));
  };

  return (
    <div className="App">
      {!user ? (
        <div className="auth-container">
          <div className="auth-card">
            <img className="portal-logo" src="/khulna-university.png" alt="KU Logo" />
            <h2>KU CSE26 Portal</h2>
            <p>Secure file upload and management for Khulna University Computer Science & Engineering Discipline</p>
            
            <div className="email-auth">
              <div className="auth-toggle">
                <button 
                  className={!isSignUp ? 'active' : ''} 
                  onClick={() => {
                    setIsSignUp(false);
                    setEmail('');
                    setPassword('');
                    setUserName('');
                    setDiscipline('');
                    setStudentId('');
                    setBatch('');
                    setAuthError('');
                  }}
                >
                  Sign In
                </button>
                <button 
                  className={isSignUp ? 'active' : ''} 
                  onClick={() => {
                    setIsSignUp(true);
                    setEmail('');
                    setPassword('');
                    setUserName('');
                    setDiscipline('');
                    setStudentId('');
                    setBatch('');
                    setAuthError('');
                  }}
                >
                  Sign Up
                </button>
              </div>
              
              {isSignUp && (
                <>
                  <input 
                    type="text" 
                    placeholder="Full Name (real name is recommended)" 
                    value={userName} 
                    onChange={(e) => setUserName(e.target.value)} 
                  />
                </>
              )}
              <input 
                type="email" 
                placeholder="Email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
              />
              <input 
                type="password" 
                placeholder="Password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
              {isSignUp && (
                <>
                  <div className="sign-up-type-tabs">
                    <button
                      className={signUpType === 'student' ? 'active' : ''}
                      onClick={() => {
                        setSignUpType('student');
                        setDiscipline('');
                        setStudentId('');
                        setBatch('');
                      }}
                    >
                      Student
                    </button>
                    <button
                      className={signUpType === 'teacher' ? 'active' : ''}
                      onClick={() => {
                        setSignUpType('teacher');
                        setDiscipline('');
                        setStudentId('');
                        setBatch('');
                      }}
                    >
                      Teacher
                    </button>
                  </div>

                  <input 
                    type="text" 
                    placeholder="Discipline" 
                    value={discipline} 
                    onChange={(e) => setDiscipline(e.target.value)} 
                  />

                  {signUpType === 'student' && (
                    <>
                      <input 
                        type="text" 
                        placeholder="Student ID" 
                        value={studentId} 
                        onChange={(e) => setStudentId(e.target.value)} 
                      />
                      <input 
                        type="text" 
                        placeholder="Batch" 
                        value={batch} 
                        onChange={(e) => setBatch(e.target.value)} 
                      />
                    </>
                  )}
                </>
              )}
              
              
              
              {authError && <p className="auth-error">{authError}</p>}
              
              <button 
                className="btn btn-secondary" 
                onClick={isSignUp ? handleEmailSignUp : handleEmailSignIn}
              >
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </button>
            </div>
            
            <div className="auth-divider">or</div>
            
            <button className="btn btn-primary" onClick={handleLogin}>
              Sign in with Google
            </button>
          </div>
        </div>
      ) : (
        <>
          <header className="header">
            <div className="logo-section">
              <img className="header-logo" src="/khulna-university.png" alt="KU Logo" />
              <div className="logo-text">
                <h1><a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>KU CSE26 Portal</a></h1>
                <p>Khulna University Computer Science & Engineering Discipline</p>
              </div>
            </div>
            <div className="header-right">
              <div className="user-info">
                <p>👤 {user.displayName}</p>
                <div className="user-email">{user.email}</div>
              </div>
              <div className="tab-menu">
                <button
                  className="more-sign"
                  onClick={() => {
                    setMenuOpen((open) => !open);
                    setProfileOpen(false);
                  }}
                  aria-label="Toggle menu"
                >
                  <span />
                  <span />
                  <span />
                </button>
                <div className={`tabs-dropdown ${menuOpen ? 'open' : ''}`}>
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
                      onClick={() => {
                        setActiveTab(tab.key);
                        setMenuOpen(false);
                        setIsViewingProfile(false);
                        setIsEditingProfile(false);
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="profile-menu">
                <button
                  className="profile-button"
                  onClick={() => {
                    setProfileOpen((open) => !open);
                    setMenuOpen(false);
                  }}
                  aria-label="Open profile menu"
                >
                  <div className="profile-picture">
                    {profilePicture ? (
                      <img src={profilePicture} alt="Profile" />
                    ) : (
                      <span>👤</span>
                    )}
                  </div>
                </button>
                <div className={`profile-dropdown ${profileOpen ? 'open' : ''}`}>
                  <button
                    className="profile-option"
                    onClick={() => {
                      setIsViewingProfile(true);
                      setProfileOpen(false);
                      setMenuOpen(false);
                    }}
                  >
                    👁️ View Profile
                  </button>
                  <button
                    className="profile-option"
                    onClick={() => {
                      setIsEditingProfile(true);
                      setIsViewingProfile(false);
                      setProfileOpen(false);
                      setMenuOpen(false);
                    }}
                  >
                    ✏️ Edit Profile
                  </button>
                  <div className="profile-divider"></div>
                  <button
                    className="profile-option logout-option"
                    onClick={() =>{
                      setShowLogoutConfirm(true);
                      setProfileOpen(false);
                    }}
                  >
                    🚪 Log Out
                  </button>
                </div>
              </div>
            </div>
          </header>

          {showLogoutConfirm && (
            <div className="modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>Confirm Logout</h2>
                <p>Are you sure you want to log out?</p>
                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={() => setShowLogoutConfirm(false)}>
                    Cancel
                  </button>
                  <button className="btn btn-danger" onClick={handleConfirmLogout}>
                    Yes, Log Out
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="main-container">
            <div className="dashboard">
              {isEditingProfile || isViewingProfile ? (
                <div className="profile-section">
                  {isViewingProfile ? (
                    <div className="profile-view-section">
                      <div className="section-header">
                        <h2>👤 Profile</h2>
                        <p className="section-desc">Your profile information.</p>
                      </div>

                      <div className="view-profile-card">
                        <div className="profile-picture-large">
                          {profilePicture ? (
                            <img src={profilePicture} alt="Profile" />
                          ) : (
                            <span>👤</span>
                          )}
                        </div>

                        <div className="profile-info">
                          <div className="form-group">
                            <label>Display Name</label>
                            <p>{user.displayName}</p>
                          </div>

                          <div className="form-group">
                            <label>Email</label>
                            <p>{user.email}</p>
                          </div>

                          <div className="form-group">
                            <label>Role</label>
                            <p>{userRole === 'student' ? 'Student' : userRole === 'teacher' ? 'Teacher' : 'Not specified'}</p>
                          </div>

                          <div className="form-group">
                            <label>Discipline</label>
                            <p>{discipline || 'Not specified'}</p>
                          </div>

                          {userRole === 'student' && (
                            <>
                              <div className="form-group">
                                <label>Student ID</label>
                                <p>{studentId || 'Not specified'}</p>
                              </div>

                              <div className="form-group">
                                <label>Batch</label>
                                <p>{batch || 'Not specified'}</p>
                              </div>

                              <div className="form-group">
                                <label>College</label>
                                <p>{college || 'Not specified'}</p>
                              </div>

                              <div className="form-group">
                                <label>School</label>
                                <p>{school || 'Not specified'}</p>
                              </div>
                            </>
                          )}

                          <div className="form-group">
                            <label>Home Address</label>
                            <p>{homeAddress || 'Not specified'}</p>
                          </div>

                          <div className="form-group">
                            <label>Current Address</label>
                            <p>{currentAddress || 'Not specified'}</p>
                          </div>

                          <div className="form-group">
                            <label>Mobile No.</label>
                            <p>{mobileNo || 'Not specified'}</p>
                          </div>

                          <div className="form-group">
                            <label>Bio</label>
                            <p>{userBio || 'No bio added yet.'}</p>
                          </div>
                        </div>

                        <div className="profile-actions">
                          <button className="btn btn-primary" onClick={() => setIsViewingProfile(false)}>
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="profile-edit-section">
                      <div className="section-header">
                        <h2>✏️ Edit Profile</h2>
                        <p className="section-desc">Update your profile information and picture.</p>
                      </div>

                      <div className="edit-profile-card">
                        <div className="profile-picture-upload">
                          <div className="profile-picture-large">
                            {profilePicture ? (
                              <img src={profilePicture} alt="Profile" />
                            ) : (
                              <span>📷</span>
                            )}
                          </div>
                          <label htmlFor="profile-pic-input" className="upload-label">
                            Change Picture
                          </label>
                          <input
                            id="profile-pic-input"
                            type="file"
                            accept="image/*"
                            onChange={handleProfilePictureUpload}
                            style={{ display: 'none' }}
                          />
                        </div>

                        <div className="profile-form">
                          <div className="form-group">
                            <label>Display Name</label>
                            <input type="text" value={user.displayName || ''} disabled />
                          </div>

                          <div className="form-group">
                            <label>Email</label>
                            <input type="email" value={user.email || ''} disabled />
                          </div>

                          <div className="form-group">
                            <label>Role</label>
                            <select value={userRole} onChange={(e) => setUserRole(e.target.value)}>
                              <option value="">Select Role</option>
                              <option value="student">Student</option>
                              <option value="teacher">Teacher</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label>Discipline</label>
                            <input 
                              type="text" 
                              value={discipline} 
                              onChange={(e) => setDiscipline(e.target.value)} 
                              placeholder="Enter your discipline"
                            />
                          </div>

                          {userRole === 'student' && (
                            <>
                              <div className="form-group">
                                <label>Student ID</label>
                                <input 
                                  type="text" 
                                  value={studentId} 
                                  onChange={(e) => setStudentId(e.target.value)} 
                                  placeholder="Enter your student ID"
                                />
                              </div>

                              <div className="form-group">
                                <label>Batch</label>
                                <input 
                                  type="text" 
                                  value={batch} 
                                  onChange={(e) => setBatch(e.target.value)} 
                                  placeholder="Enter your batch"
                                />
                              </div>

                              <div className="form-group">
                                <label>College</label>
                                <input 
                                  type="text" 
                                  value={college} 
                                  onChange={(e) => setCollege(e.target.value)} 
                                  placeholder="Enter your college name"
                                />
                              </div>

                              <div className="form-group">
                                <label>School</label>
                                <input 
                                  type="text" 
                                  value={school} 
                                  onChange={(e) => setSchool(e.target.value)} 
                                  placeholder="Enter your school name"
                                />
                              </div>
                            </>
                          )}

                          <div className="form-group">
                            <label>Home Address</label>
                            <textarea
                              value={homeAddress}
                              onChange={(e) => setHomeAddress(e.target.value)}
                              placeholder="Enter your home address"
                              rows="3"
                            ></textarea>
                          </div>

                          <div className="form-group">
                            <label>Current Address</label>
                            <textarea
                              value={currentAddress}
                              onChange={(e) => setCurrentAddress(e.target.value)}
                              placeholder="Enter your current address"
                              rows="3"
                            ></textarea>
                          </div>

                          <div className="form-group">
                            <label>Mobile No.</label>
                            <input 
                              type="tel" 
                              value={mobileNo} 
                              onChange={(e) => setMobileNo(e.target.value)} 
                              placeholder="Enter your mobile number"
                            />
                          </div>

                          <div className="form-group">
                            <label>Bio</label>
                            <textarea
                              value={userBio}
                              onChange={(e) => setUserBio(e.target.value)}
                              placeholder="Tell us about yourself..."
                              rows="4"
                            ></textarea>
                          </div>

                          <div className="profile-actions">
                            <button className="btn btn-primary" onClick={handleSaveProfile}>
                              Save Changes
                            </button>
                            <button className="btn btn-secondary" onClick={() => setIsEditingProfile(false)}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="tab-content">
                {activeTab === 'files' && (
                  <div className="files-section">
                    <div className="section-header">
                      <h2>📂 Uploaded Files</h2>
                      <p className="section-desc">
                        Browse public uploads and your private files. Public files are visible to everyone.
                      </p>
                    </div>

                    <div className="files-list">
                      {visibleFiles.length === 0 ? (
                        <div className="no-files">
                          <div className="icon-large">📭</div>
                          <p>No files are available right now.</p>
                        </div>
                      ) : (
                        visibleFiles.map((f, index) => {
                          const fileVisibility = f.visibility || 'public';
                          return (
                            <div key={f.id || index} className="file-item">
                              <div className="file-info">
                                <div className="file-name-display">📄 {f.fileName}</div>
                                <div className="file-uploader">
                                  {fileVisibility === 'private' ? '🔒 Private file' : '🌐 Public file'} • Uploaded by {f.uploadedBy}
                                </div>
                              </div>
                              <div className="file-actions">
                                <a href={f.fileUrl} target="_blank" rel="noreferrer">
                                  Download
                                </a>
                                <button
                                  className="btn-save-file"
                                  onClick={() => handleSaveFile(f.id)}
                                  title="Save file"
                                >
                                  ⭐ Save
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'upload' && (
                  <div className="upload-section">
                    <div className="section-header">
                      <h2>📤 Upload</h2>
                      <p className="section-desc">
                        Upload any file to the portal. Choose whether it should be public or private.
                      </p>
                    </div>

                    {message && (
                      <div className={`status status-${message.type}`}>
                        {message.text}
                      </div>
                    )}

                    <div className="file-input-wrapper">
                      <label className="file-input-label">
                        <input
                          type="file"
                          onChange={(e) => setFile(e.target.files[0])}
                        />
                        <div className="upload-icon">📁</div>
                        <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                          Click to select or drag & drop
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                          Choose a project file or document to upload
                        </div>
                      </label>
                      {file && (
                        <div className="file-name">
                          ✓ Selected: {file.name}
                        </div>
                      )}
                    </div>

                    <div className="visibility-options">
                      <label>
                        <input
                          type="radio"
                          name="visibility"
                          value="public"
                          checked={visibility === 'public'}
                          onChange={() => setVisibility('public')}
                        />
                        Public
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="visibility"
                          value="private"
                          checked={visibility === 'private'}
                          onChange={() => setVisibility('private')}
                        />
                        Private
                      </label>
                    </div>

                    <div className="upload-actions">
                      <button
                        className="btn btn-primary"
                        onClick={handleUpload}
                        disabled={uploading}
                      >
                        {uploading ? '⏳ Uploading...' : '🚀 Upload'}
                      </button>
                      {file && (
                        <button
                          className="btn btn-secondary"
                          onClick={() => setFile(null)}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'chat' && (
                  <div className="chat-section">
                    <div className="section-header">
                      <h2>💬 Chat</h2>
                      <p className="section-desc">
                        Group chat for all users. Share updates, project notes, and coordination messages.
                      </p>
                    </div>

                    <div className="chat-card">
                      <div className="chat-list">
                        {chatMessages.map((message, index) => (
                          <div key={index} className="chat-item">
                            <div className="chat-meta">
                              <span className="chat-author">{message.author}</span>
                              <span className="chat-time">{new Date(message.time).toLocaleTimeString()}</span>
                            </div>
                            <div className="chat-text">{message.text}</div>
                          </div>
                        ))}
                      </div>

                      <form onSubmit={handleSendMessage} className="chat-form">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Write a message..."
                        />
                        <button className="btn btn-primary" type="submit">
                          Send
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {activeTab === 'team' && (
                  <div className="team-section">
                    <div className="section-header">
                      <h2>👥 Team Behind</h2>
                      <p className="section-desc">
                        Meet the team and key contributors behind the portal.
                      </p>
                    </div>

                    <div className="team-card">
                      <div className="team-member">
                        <div>
                          <h3>GitHub Copilot</h3>
                          <p className="team-role">AI Assistant / Frontend Support</p>
                        </div>
                        <div className="team-details">
                          <p>Role: UI design, portal logic, and interactive deployment support.</p>
                          <p>Focus: Making the portal easy to use, modern, and CSE-friendly.</p>
                          <p>Contact: Available inside the development workflow.</p>
                        </div>
                      </div>

                      <div className="team-note">
                        <p>
                          This portal is built as a collaborative learning tool for Khulna University's CSE discipline.
                          More team members and details can be added once the project grows.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'saved' && (
                  <div className="saved-section">
                    <div className="section-header">
                      <h2>💾 Saved Items</h2>
                      <p className="section-desc">
                        Files you have saved for quick access.
                      </p>
                    </div>

                    <div className="files-list">
                      {savedItems.length === 0 ? (
                        <div className="no-files">
                          <div className="icon-large">📭</div>
                          <p>No saved items yet. Save files from Uploaded Files tab.</p>
                        </div>
                      ) : (
                        savedItems.map((f, index) => (
                          <div key={f.id || index} className="file-item">
                            <div className="file-info">
                              <div className="file-name-display">📄 {f.fileName}</div>
                              <div className="file-uploader">
                                Saved • Uploaded by {f.uploadedBy}
                              </div>
                            </div>
                            <div className="file-actions">
                              <a href={f.fileUrl} target="_blank" rel="noreferrer">
                                Download
                              </a>
                              <button
                                className="btn-remove-save"
                                onClick={() => handleRemoveSavedFile(f.id)}
                                title="Remove from saved"
                              >
                                ✕ Remove
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;