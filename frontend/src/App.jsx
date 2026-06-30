import React, { useState, useEffect } from 'react';
import './App.css';

const BACKEND_URL = window.location.origin.includes('localhost') ? 'http://localhost:5000' : '35.255.248.217:5000';

function App() {
  // Session & Auth State
  const [token, setToken] = useState(localStorage.getItem('renteasy_token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('renteasy_user')) || null);
  
  // Auth Form State
  const [isLoginView, setIsLoginView] = useState(true);
  const [authRole, setAuthRole] = useState('student'); // 'student' | 'owner'
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');

  // Listings State
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search & Filter State
  const [searchLocation, setSearchLocation] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterMaxRent, setFilterMaxRent] = useState(25000);

  // Detail Modal State
  const [selectedProperty, setSelectedProperty] = useState(null);

  // Owner Actions State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editProperty, setEditProperty] = useState(null);
  
  // Property Form State
  const [propertyForm, setPropertyForm] = useState({
    name: '',
    type: 'Hostel',
    rent: '',
    location: '',
    description: '',
    contact: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [formError, setFormError] = useState('');

  // Auto-fetch profile if token exists but no user info
  useEffect(() => {
    if (token && !user) {
      fetchProfile();
    }
  }, [token]);

  // Fetch properties whenever filters change
  useEffect(() => {
    fetchProperties();
  }, [searchLocation, filterType, filterMaxRent]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        localStorage.setItem('renteasy_user', JSON.stringify(data.user));
      } else {
        handleLogout();
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (searchLocation) queryParams.append('location', searchLocation);
      if (filterType) queryParams.append('type', filterType);
      if (filterMaxRent) queryParams.append('maxRent', filterMaxRent);

      const response = await fetch(`${BACKEND_URL}/api/properties?${queryParams.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setProperties(data);
      }
    } catch (err) {
      console.error('Error fetching properties:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (!authForm.email || !authForm.password || (!isLoginView && !authForm.name)) {
      setAuthError('Please fill out all required fields.');
      return;
    }

    const endpoint = isLoginView ? '/api/auth/login' : '/api/auth/register';
    const payload = isLoginView
      ? { email: authForm.email, password: authForm.password }
      : { name: authForm.name, email: authForm.email, password: authForm.password, role: authRole };

    try {
      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        setAuthError(data.message || 'Authentication failed. Please check credentials.');
        return;
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('renteasy_token', data.token);
      localStorage.setItem('renteasy_user', JSON.stringify(data.user));
      
      // Clear forms
      setAuthForm({ name: '', email: '', password: '' });
    } catch (err) {
      setAuthError('Unable to connect to the server. Please try again later.');
    }
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('renteasy_token');
    localStorage.removeItem('renteasy_user');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handlePropertySubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const { name, type, rent, location, description, contact } = propertyForm;
    if (!name || !type || !rent || !location || !description || !contact) {
      setFormError('Please fill in all listing details.');
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('type', type);
    formData.append('rent', rent);
    formData.append('location', location);
    formData.append('description', description);
    formData.append('contact', contact);
    if (selectedFile) {
      formData.append('image', selectedFile);
    }

    const endpoint = isEditModalOpen
      ? `${BACKEND_URL}/api/properties/${editProperty.id || editProperty._id}`
      : `${BACKEND_URL}/api/properties`;
    
    const method = isEditModalOpen ? 'PUT' : 'POST';

    try {
      const response = await fetch(endpoint, {
        method: method,
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        setFormError(data.message || 'Failed to save property listing.');
        return;
      }

      // Refresh listings
      fetchProperties();

      // Reset & Close
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      setEditProperty(null);
      setSelectedFile(null);
      setImagePreview('');
      setPropertyForm({
        name: '',
        type: 'Hostel',
        rent: '',
        location: '',
        description: '',
        contact: ''
      });
    } catch (err) {
      setFormError('Server error while saving listing.');
    }
  };

  const handleEditClick = (prop) => {
    setEditProperty(prop);
    setPropertyForm({
      name: prop.name,
      type: prop.type,
      rent: prop.rent,
      location: prop.location,
      description: prop.description,
      contact: prop.contact
    });
    setImagePreview(prop.image ? `${BACKEND_URL}${prop.image}` : '');
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = async (propId) => {
    if (!window.confirm('Are you sure you want to delete this property?')) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/properties/${propId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        fetchProperties();
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to delete listing.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Get current owner listings (if logged in as owner)
  const myProperties = user && user.role === 'owner'
    ? properties.filter(p => p.ownerId === user.id || (p.ownerId && p.ownerId._id === user.id) || p.ownerId === user._id)
    : [];

  return (
    <div>
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-brand" onClick={() => window.location.reload()}>
          Rent<span>Easy</span>
        </div>
        <div className="nav-menu">
          {user ? (
            <>
              <div className="nav-user">
                <span className={`user-badge ${user.role}`}>
                  {user.role}
                </span>
                <span className="user-name">{user.name}</span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <span className="text-secondary" style={{ fontSize: '0.9rem' }}>Student Rental Finder</span>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      {!user ? (
        // Auth Container
        <div className="auth-container">
          <div className="auth-card">
            <h1 className="auth-title">Welcome to RentEasy</h1>
            <p className="auth-subtitle">
              {isLoginView ? 'Sign in to discover student listings' : 'Create an account to start search / listing'}
            </p>

            {authError && <div className="error-alert">{authError}</div>}

            <form onSubmit={handleAuthSubmit}>
              {!isLoginView && (
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter your name"
                    value={authForm.name}
                    onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="name@university.edu"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  required
                />
              </div>

              {!isLoginView && (
                <div className="form-group">
                  <label className="form-label">Account Role</label>
                  <div className="form-switch">
                    <div
                      className={`form-switch-option ${authRole === 'student' ? 'active' : ''}`}
                      onClick={() => setAuthRole('student')}
                    >
                      Student / Tenant
                    </div>
                    <div
                      className={`form-switch-option ${authRole === 'owner' ? 'active' : ''}`}
                      onClick={() => setAuthRole('owner')}
                    >
                      Property Owner
                    </div>
                  </div>
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                {isLoginView ? 'Sign In' : 'Sign Up'}
              </button>
            </form>

            <div className="auth-toggle">
              {isLoginView ? (
                <>
                  Don't have an account? <span onClick={() => { setIsLoginView(false); setAuthError(''); }}>Sign up</span>
                </>
              ) : (
                <>
                  Already have an account? <span onClick={() => { setIsLoginView(true); setAuthError(''); }}>Sign in</span>
                </>
              )}
            </div>

            

          </div>
        </div>
      ) : (
        // Dashboard (Student View OR Owner View)
        <div className="dashboard-container">
          
          {user.role === 'owner' ? (
            /* OWNER DASHBOARD */
            <div>
              <div className="dashboard-header">
                <div>
                  <h1 className="dashboard-title">My Properties</h1>
                  <p className="text-secondary" style={{ fontSize: '0.9rem' }}>Manage and edit your listed accommodations</p>
                </div>
                <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
                  + Add Property
                </button>
              </div>

              {myProperties.length === 0 ? (
                <div className="empty-state">
                  <h3 className="empty-state-title">No listings found</h3>
                  <p className="empty-state-desc">You haven't added any property listings yet. Click the button above to add your first hostel, PG, or house.</p>
                  <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
                    Add Property Now
                  </button>
                </div>
              ) : (
                <div className="property-grid">
                  {myProperties.map((prop) => (
                    <div key={prop.id || prop._id} className="property-card">
                      <div className="property-image-wrapper">
                        {prop.image ? (
                          <img src={`${BACKEND_URL}${prop.image}`} alt={prop.name} className="property-image" />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>No Image</div>
                        )}
                        <span className={`property-badge ${prop.type.toLowerCase()}`}>{prop.type}</span>
                        <span className="property-rent-badge">₹{prop.rent}/mo</span>
                      </div>
                      <div className="property-content">
                        <h3 className="property-card-title">{prop.name}</h3>
                        <div className="property-card-location">📍 {prop.location}</div>
                        <p className="property-card-desc">{prop.description}</p>
                        
                        <div className="property-card-actions">
                          <button className="btn btn-secondary btn-sm" onClick={() => handleEditClick(prop)}>
                            Edit
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteClick(prop.id || prop._id)}>
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* STUDENT / SEARCH DASHBOARD */
            <div>
              <div className="dashboard-header">
                <div>
                  <h1 className="dashboard-title">Find Student Rentals</h1>
                  <p className="text-secondary" style={{ fontSize: '0.9rem' }}>Search hostels, PG rooms, and apartments</p>
                </div>
              </div>

              {/* Search Filters */}
              <div className="filter-card">
                <div className="filter-grid">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Search by Location</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter city, university, or region..."
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Property Type</label>
                    <select
                      className="form-select"
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                    >
                      <option value="">All Types</option>
                      <option value="Hostel">Hostel</option>
                      <option value="PG">PG (Paying Guest)</option>
                      <option value="House">House</option>
                    </select>
                  </div>

                  <div className="range-slider-container">
                    <div className="range-slider-label">
                      <span>Max Rent</span>
                      <span style={{ color: 'var(--color-primary)' }}>₹{filterMaxRent}/mo</span>
                    </div>
                    <input
                      type="range"
                      className="range-slider"
                      min="3000"
                      max="25000"
                      step="500"
                      value={filterMaxRent}
                      onChange={(e) => setFilterMaxRent(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              {/* Properties Listings */}
              {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>Loading rental listings...</div>
              ) : properties.length === 0 ? (
                <div className="empty-state">
                  <h3 className="empty-state-title">No listings matches found</h3>
                  <p className="empty-state-desc">Try clearing search text, raising maximum rent limit, or selecting different property filters.</p>
                </div>
              ) : (
                <div className="property-grid">
                  {properties.map((prop) => (
                    <div key={prop.id || prop._id} className="property-card">
                      <div className="property-image-wrapper">
                        {prop.image ? (
                          <img 
                            src={prop.image.startsWith('http') ? prop.image : `${BACKEND_URL}${prop.image}`} 
                            alt={prop.name} 
                            className="property-image" 
                          />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>No Image</div>
                        )}
                        <span className={`property-badge ${prop.type.toLowerCase()}`}>{prop.type}</span>
                        <span className="property-rent-badge">₹{prop.rent}/mo</span>
                      </div>
                      <div className="property-content">
                        <h3 className="property-card-title">{prop.name}</h3>
                        <div className="property-card-location">📍 {prop.location}</div>
                        <p className="property-card-desc">{prop.description}</p>
                        
                        <div className="property-card-actions">
                          <button className="btn btn-primary btn-sm" onClick={() => setSelectedProperty(prop)}>
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* PROPERTY DETAIL MODAL */}
      {selectedProperty && (
        <div className="modal-overlay" onClick={() => setSelectedProperty(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{selectedProperty.name}</h2>
              <button className="modal-close" onClick={() => setSelectedProperty(null)}>&times;</button>
            </div>
            <div className="modal-body">
              {selectedProperty.image ? (
                <img 
                  src={selectedProperty.image.startsWith('http') ? selectedProperty.image : `${BACKEND_URL}${selectedProperty.image}`} 
                  alt={selectedProperty.name} 
                  className="detail-image" 
                />
              ) : (
                <div className="detail-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}>
                  No Image Available
                </div>
              )}
              
              <div className="detail-row">
                <span className={`property-badge ${selectedProperty.type.toLowerCase()}`}>{selectedProperty.type}</span>
                <span className="detail-price">₹{selectedProperty.rent} <span style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>/ month</span></span>
              </div>

              <div className="detail-info-grid">
                <div>
                  <div className="detail-info-label">LOCATION</div>
                  <div className="detail-info-val">📍 {selectedProperty.location}</div>
                </div>
                <div>
                  <div className="detail-info-label">CONTACT EMAIL</div>
                  <div className="detail-info-val">📧 {selectedProperty.ownerId && selectedProperty.ownerId.email ? selectedProperty.ownerId.email : 'owner@renteasy.com'}</div>
                </div>
              </div>

              <div className="detail-section-title">Description</div>
              <p className="detail-desc">{selectedProperty.description}</p>

              <div className="detail-contact-box">
                <div className="detail-info-label" style={{color: 'var(--text-primary)', fontWeight: 600}}>Call Owner Directly to Book:</div>
                <span className="contact-phone">📞 {selectedProperty.contact}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT PROPERTY MODAL */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="modal-overlay" onClick={() => {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
          setEditProperty(null);
          setSelectedFile(null);
          setImagePreview('');
          setPropertyForm({ name: '', type: 'Hostel', rent: '', location: '', description: '', contact: '' });
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{isEditModalOpen ? 'Edit Property Listing' : 'List New Property'}</h2>
              <button className="modal-close" onClick={() => {
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
                setEditProperty(null);
                setSelectedFile(null);
                setImagePreview('');
                setPropertyForm({ name: '', type: 'Hostel', rent: '', location: '', description: '', contact: '' });
              }}>&times;</button>
            </div>
            <div className="modal-body">
              {formError && <div className="error-alert">{formError}</div>}
              
              <form onSubmit={handlePropertySubmit}>
                <div className="form-group">
                  <label className="form-label">Property Title</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Cozy Girls Hostel, Spacious Single Room PG"
                    value={propertyForm.name}
                    onChange={(e) => setPropertyForm({ ...propertyForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Property Type</label>
                  <select
                    className="form-select"
                    value={propertyForm.type}
                    onChange={(e) => setPropertyForm({ ...propertyForm, type: e.target.value })}
                  >
                    <option value="Hostel">Hostel</option>
                    <option value="PG">PG</option>
                    <option value="House">House</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Monthly Rent (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="e.g. 5000"
                    value={propertyForm.rent}
                    onChange={(e) => setPropertyForm({ ...propertyForm, rent: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Location / Address</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Near University Main Gate, Sector 4"
                    value={propertyForm.location}
                    onChange={(e) => setPropertyForm({ ...propertyForm, location: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Contact Mobile Number</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="e.g. +91 98765 43210"
                    value={propertyForm.contact}
                    onChange={(e) => setPropertyForm({ ...propertyForm, contact: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Listing Description</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Provide details about rooms, amenities, food, wi-fi, deposit rules, security..."
                    value={propertyForm.description}
                    onChange={(e) => setPropertyForm({ ...propertyForm, description: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Property Image</label>
                  <div className="file-upload-container">
                    <label className="file-upload-label">
                      📁 Select or Upload Photo
                      <input
                        type="file"
                        accept="image/*"
                        className="file-upload-input"
                        onChange={handleFileChange}
                      />
                    </label>
                    {imagePreview && (
                      <img src={imagePreview} alt="Preview" className="file-upload-preview" />
                    )}
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                  {isEditModalOpen ? 'Save Changes' : 'List Property'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
