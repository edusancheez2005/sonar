'use client'

import React, { useState, useEffect, useMemo } from 'react'
import styled from 'styled-components'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
`

const PageHeader = styled.div`
  margin-bottom: 2rem;
`

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
`

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin: 0;
`

const FilterBar = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  align-items: center;
`

const SearchInput = styled.input`
  padding: 0.75rem 1.25rem;
  background: rgba(30, 57, 81, 0.6);
  border: 1px solid rgba(54, 166, 186, 0.3);
  border-radius: 12px;
  color: var(--text-primary);
  font-size: 1rem;
  min-width: 250px;
  transition: border-color 0.3s;
  
  &:focus {
    outline: none;
    border-color: var(--primary);
  }
  
  &::placeholder {
    color: var(--text-secondary);
  }
`

const CategoryChip = styled.button`
  padding: 0.5rem 1.25rem;
  background: ${props => props.$active ? 'var(--primary)' : 'rgba(30, 57, 81, 0.6)'};
  border: 1px solid ${props => props.$active ? 'var(--primary)' : 'rgba(54, 166, 186, 0.3)'};
  border-radius: 20px;
  color: ${props => props.$active ? '#000' : 'var(--text-secondary)'};
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-transform: capitalize;
  
  &:hover {
    border-color: var(--primary);
    color: var(--text-primary);
  }
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.25rem;
`

const EntityCard = styled(motion.div)`
  background: linear-gradient(135deg, #0d2134 0%, #1a2f42 100%);
  border: 1px solid ${props => props.$famous ? 'rgba(241, 196, 15, 0.3)' : 'rgba(54, 166, 186, 0.2)'};
  border-radius: 16px;
  padding: 1.5rem;
  transition: all 0.3s ease;
  cursor: pointer;
  
  &:hover {
    border-color: ${props => props.$famous ? 'rgba(241, 196, 15, 0.6)' : 'rgba(54, 166, 186, 0.5)'};
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }
`

const EntityName = styled.div`
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const FamousStar = styled.span`
  color: #f1c40f;
  font-size: 1.1rem;
`

const EntityLabel = styled.div`
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
`

const TagRow = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
`

const Tag = styled.span`
  padding: 0.25rem 0.75rem;
  background: ${props => {
    switch (props.$type) {
      case 'CEX': return 'rgba(231, 76, 60, 0.2)'
      case 'DEX': return 'rgba(155, 89, 182, 0.2)'
      case 'WHALE': return 'rgba(54, 166, 186, 0.2)'
      default: return 'rgba(100, 100, 100, 0.2)'
    }
  }};
  border: 1px solid ${props => {
    switch (props.$type) {
      case 'CEX': return 'rgba(231, 76, 60, 0.4)'
      case 'DEX': return 'rgba(155, 89, 182, 0.4)'
      case 'WHALE': return 'rgba(54, 166, 186, 0.4)'
      default: return 'rgba(100, 100, 100, 0.4)'
    }
  }};
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
`

const AddressCount = styled.div`
  font-size: 0.85rem;
  color: var(--text-secondary);
`

const AddressPreview = styled.div`
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
  color: var(--primary);
  opacity: 0.7;
  margin-top: 0.5rem;
`

const Stats = styled.div`
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
`

const StatBox = styled.div`
  background: rgba(30, 57, 81, 0.4);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 12px;
  padding: 1rem 1.5rem;
  
  .label {
    font-size: 0.8rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    font-weight: 600;
    margin-bottom: 0.25rem;
  }
  .value {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--text-primary);
  }
`

const Loading = styled.div`
  text-align: center;
  padding: 4rem;
  color: var(--text-secondary);
  font-size: 1.2rem;
`

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem;
  color: var(--text-secondary);
  font-size: 1.1rem;
`

export default function EntitiesClient() {
  const [entities, setEntities] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/whales/entities?limit=500')
        const json = await res.json()
        setEntities(json.entities || [])
        setCategories(json.categories || [])
      } catch (err) {
        console.error('Failed to load entities:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    let list = entities
    if (activeCategory) {
      list = list.filter(e => e.category === activeCategory)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(e => 
        e.entity_name?.toLowerCase().includes(q) ||
        e.label?.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q)
      )
    }
    return list
  }, [entities, activeCategory, search])

  const famousCount = entities.filter(e => e.is_famous).length
  const totalAddresses = entities.reduce((s, e) => s + e.address_count, 0)

  if (loading) return <Container><Loading>Loading entities...</Loading></Container>

  return (
    <Container>
      <PageHeader>
        <Title>Named Entities & Famous Whales</Title>
        <Subtitle>Track 70,000+ identified wallets across exchanges, institutions, protocols, and notable individuals</Subtitle>
      </PageHeader>

      <Stats>
        <StatBox>
          <div className="label">Named Entities</div>
          <div className="value">{entities.length.toLocaleString()}</div>
        </StatBox>
        <StatBox>
          <div className="label">Tracked Addresses</div>
          <div className="value">{totalAddresses.toLocaleString()}</div>
        </StatBox>
        <StatBox>
          <div className="label">Famous Wallets</div>
          <div className="value">{famousCount}</div>
        </StatBox>
        <StatBox>
          <div className="label">Categories</div>
          <div className="value">{categories.length}</div>
        </StatBox>
      </Stats>

      <FilterBar>
        <SearchInput 
          placeholder="Search entities (e.g. Vitalik, Binance, Wintermute)..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <CategoryChip $active={!activeCategory} onClick={() => setActiveCategory(null)}>All</CategoryChip>
        {categories.map(cat => (
          <CategoryChip 
            key={cat} 
            $active={activeCategory === cat}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
          >
            {cat}
          </CategoryChip>
        ))}
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState>No entities found matching your filters.</EmptyState>
      ) : (
        <Grid>
          <AnimatePresence mode="popLayout">
            {filtered.slice(0, 100).map(entity => (
              <Link 
                key={entity.entity_name} 
                href={`/whale/${encodeURIComponent(entity.addresses[0]?.address || '')}`}
                style={{ textDecoration: 'none' }}
              >
                <EntityCard
                  $famous={entity.is_famous}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                >
                  <EntityName>
                    {entity.is_famous && <FamousStar>★</FamousStar>}
                    {entity.entity_name}
                  </EntityName>
                  {entity.label && <EntityLabel>{entity.label}</EntityLabel>}
                  <TagRow>
                    <Tag $type={entity.address_type}>{entity.address_type}</Tag>
                    {entity.category && <Tag>{entity.category}</Tag>}
                    {entity.subcategory && <Tag>{entity.subcategory}</Tag>}
                    {entity.signal_potential && <Tag>{entity.signal_potential} signal</Tag>}
                  </TagRow>
                  <AddressCount>{entity.address_count} tracked address{entity.address_count !== 1 ? 'es' : ''}</AddressCount>
                  <AddressPreview>
                    {entity.addresses[0]?.address?.slice(0, 10)}...{entity.addresses[0]?.address?.slice(-6)}
                  </AddressPreview>
                </EntityCard>
              </Link>
            ))}
          </AnimatePresence>
        </Grid>
      )}
    </Container>
  )
}
