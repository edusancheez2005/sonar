'use client'
import { useState } from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import Navbar from '@/src/components/Navbar'
import Footer from '@/src/components/Footer'

const PageContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0a1621 0%, #0f1922 50%, #0a1621 100%);
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 30%, rgba(54, 166, 186, 0.08) 0%, transparent 50%),
      radial-gradient(circle at 80% 70%, rgba(46, 204, 113, 0.06) 0%, transparent 50%);
    pointer-events: none;
  }
`

const Content = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 8rem 2rem 4rem;
  position: relative;
  z-index: 1;
`

const Title = styled(motion.h1)`
  font-size: 3rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary) 0%, #2ecc71 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 1rem;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`

const Subtitle = styled.p`
  text-align: center;
  color: var(--text-secondary);
  font-size: 1.1rem;
  margin-bottom: 3rem;
  line-height: 1.6;
`

const FormCard = styled(motion.div)`
  background: rgba(13, 33, 52, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 16px;
  padding: 2.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
`

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`

const Label = styled.label`
  display: block;
  color: var(--primary);
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  padding-left: 0.25rem;
`

const Input = styled.input`
  width: 100%;
  background: rgba(13, 33, 52, 0.8);
  border: 1px solid rgba(54, 166, 186, 0.3);
  color: var(--text-primary);
  padding: 0.875rem 1rem;
  border-radius: 12px;
  font-size: 0.95rem;
  outline: none;
  transition: all 0.3s ease;

  &::placeholder {
    color: var(--text-secondary);
    opacity: 0.6;
  }

  &:hover {
    border-color: rgba(54, 166, 186, 0.5);
  }

  &:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(54, 166, 186, 0.15);
  }
`

const Select = styled.select`
  width: 100%;
  background: rgba(13, 33, 52, 0.8);
  border: 1px solid rgba(54, 166, 186, 0.3);
  color: var(--text-primary);
  padding: 0.875rem 1rem;
  border-radius: 12px;
  font-size: 0.95rem;
  outline: none;
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    border-color: rgba(54, 166, 186, 0.5);
  }

  &:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(54, 166, 186, 0.15);
  }

  option {
    background: #0a1621;
    color: var(--text-primary);
  }
`

const TextArea = styled.textarea`
  width: 100%;
  background: rgba(13, 33, 52, 0.8);
  border: 1px solid rgba(54, 166, 186, 0.3);
  color: var(--text-primary);
  padding: 0.875rem 1rem;
  border-radius: 12px;
  font-size: 0.95rem;
  outline: none;
  transition: all 0.3s ease;
  resize: vertical;
  min-height: 120px;
  font-family: inherit;

  &::placeholder {
    color: var(--text-secondary);
    opacity: 0.6;
  }

  &:hover {
    border-color: rgba(54, 166, 186, 0.5);
  }

  &:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(54, 166, 186, 0.15);
  }
`

const SubmitButton = styled(motion.button)`
  width: 100%;
  background: linear-gradient(135deg, var(--primary) 0%, #2ecc71 100%);
  color: white;
  padding: 1rem 2rem;
  border-radius: 12px;
  border: none;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 1rem;
  box-shadow: 0 4px 16px rgba(54, 166, 186, 0.4);
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(54, 166, 186, 0.5);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const Message = styled(motion.div)`
  padding: 1rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  text-align: center;
  font-weight: 500;

  ${props => props.type === 'success' && `
    background: rgba(46, 204, 113, 0.1);
    border: 1px solid rgba(46, 204, 113, 0.3);
    color: #2ecc71;
  `}

  ${props => props.type === 'error' && `
    background: rgba(231, 76, 60, 0.1);
    border: 1px solid rgba(231, 76, 60, 0.3);
    color: #e74c3c;
  `}
`

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 3rem;
`

const InfoCard = styled(motion.div)`
  background: rgba(13, 33, 52, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 16px;
  padding: 2rem;
  text-align: center;

  svg {
    width: 48px;
    height: 48px;
    color: var(--primary);
    margin-bottom: 1rem;
  }

  h3 {
    color: var(--text-primary);
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
  }

  p {
    color: var(--text-secondary);
    line-height: 1.6;
  }

  a {
    color: var(--primary);
    text-decoration: none;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.8;
    }
  }
`

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: 'general',
    message: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setStatus({ type: '', message: '' })

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (response.ok) {
        setStatus({ 
          type: 'success', 
          message: 'Thank you for contacting us! We\'ll get back to you within 24-48 hours.' 
        })
        setFormData({
          name: '',
          email: '',
          subject: '',
          category: 'general',
          message: ''
        })
      } else {
        setStatus({ 
          type: 'error', 
          message: result.error || 'Something went wrong. Please try again.' 
        })
      }
    } catch (error) {
      setStatus({ 
        type: 'error', 
        message: 'Failed to send message. Please check your connection and try again.' 
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageContainer>
      <Navbar />
      <Content>
        <Title
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Contact Us
        </Title>
        <Subtitle>
          Have questions, feedback, or need support? We're here to help! <br />
          Fill out the form below and we'll get back to you as soon as possible.
        </Subtitle>

        <FormCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {status.message && (
            <Message
              type={status.type}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {status.message}
            </Message>
          )}

          <form onSubmit={handleSubmit}>
            <FormGroup>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                type="text"
                id="name"
                name="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                type="email"
                id="email"
                name="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="category">Category *</Label>
              <Select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                <option value="general">General Inquiry</option>
                <option value="support">Technical Support</option>
                <option value="billing">Billing & Subscriptions</option>
                <option value="feature">Feature Request</option>
                <option value="bug">Bug Report</option>
                <option value="partnership">Partnership / Business</option>
                <option value="feedback">Feedback</option>
                <option value="other">Other</option>
              </Select>
            </FormGroup>

            <FormGroup>
              <Label htmlFor="subject">Subject *</Label>
              <Input
                type="text"
                id="subject"
                name="subject"
                placeholder="Brief description of your inquiry"
                value={formData.subject}
                onChange={handleChange}
                required
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="message">Message *</Label>
              <TextArea
                id="message"
                name="message"
                placeholder="Please provide as much detail as possible..."
                value={formData.message}
                onChange={handleChange}
                required
              />
            </FormGroup>

            <SubmitButton
              type="submit"
              disabled={submitting}
              whileHover={{ scale: submitting ? 1 : 1.02 }}
              whileTap={{ scale: submitting ? 1 : 0.98 }}
            >
              {submitting ? 'Sending...' : 'Send Message'}
            </SubmitButton>
          </form>
        </FormCard>

        <InfoGrid>
          <InfoCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h3>Email Us</h3>
            <p>
              <a href="mailto:sonartracker@gmail.com">sonartracker@gmail.com</a>
              <br />
              <small>Response time: 24-48 hours</small>
            </p>
          </InfoCard>

          <InfoCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3>Business Hours</h3>
            <p>
              Monday - Friday<br />
              9:00 AM - 6:00 PM GMT<br />
              <small>Closed on UK public holidays</small>
            </p>
          </InfoCard>

          <InfoCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h3>Quick Help</h3>
            <p>
              Check out our <a href="/faq">FAQ page</a> for instant answers to common questions about Sonar Tracker.
            </p>
          </InfoCard>
        </InfoGrid>
      </Content>
      <Footer />
    </PageContainer>
  )
}

