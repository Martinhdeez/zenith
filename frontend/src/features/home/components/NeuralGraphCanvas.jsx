import { useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import SpriteText from 'three-spritetext';

export default function NeuralGraphCanvas({ items, currentPath, onNodeClick, onGoBack, onBreadcrumbClick }) {
  const fgRef = useRef();
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Handle window resize dynamically
  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Compute graph data (Nodes and Links)
  const graphData = useMemo(() => {
    const rootId = currentPath || '/';
    const rootName = currentPath === '/' ? '' : currentPath.split('/').filter(Boolean).pop();
    
    // The central dominant sphere
    const nodes = [{ 
      id: rootId, 
      name: rootName, 
      type: 'root', 
      val: 22 
    }];
    
    const links = [];

    // Sub-files and folders
    if (items && items.length > 0) {
      items.forEach(item => {
        nodes.push({
          id: item.id,
          name: item.name,
          type: item.file_type === 'dir' ? 'dir' : 'file',
          val: item.file_type === 'dir' ? 12 : 5,
          itemData: item
        });
        
        // Fiber-optic lines connecting to root
        links.push({
          source: rootId,
          target: item.id
        });
      });
    }

    return { nodes, links };
  }, [items, currentPath]);

  // Adjust Physics for "weightless yet snappy" elasticity
  useEffect(() => {
    if (fgRef.current) {
      const chargeForce = fgRef.current.d3Force('charge');
      if (chargeForce) chargeForce.strength(-400); // Powerful repel for expansion
      
      const linkForce = fgRef.current.d3Force('link');
      if (linkForce) linkForce.distance(120); // Keep them orbiting at a distance
    }
  }, [graphData]);

  // Precompute Three.js materials for "Glassmorphism" look
  const materials = useMemo(() => {
    return {
      root: new THREE.MeshPhysicalMaterial({
        color: 0xff4444, // Bright, true red like the primary UI buttons
        emissive: 0xff4444, // Matching bright red glow
        emissiveIntensity: 1.5, // Reduced intensity so it doesn't over-saturate to white/yellow
        transparent: true,
        opacity: 0.85, // Restored some glass-like transparency
        roughness: 0.1,
        metalness: 0.1,
        transmission: 0.8, // Allow light to pass through for a jewel-like brilliance
        thickness: 2.5,
        clearcoat: 1.0, 
        clearcoatRoughness: 0.2
      }),
      dir: new THREE.MeshPhysicalMaterial({
        color: 0x00c3ff,
        transparent: true,
        opacity: 0.8,
        roughness: 0.1,
        transmission: 0.8,
        thickness: 1.0,
        emissive: 0x00c3ff,
        emissiveIntensity: 0.5,
      }),
      file: new THREE.MeshPhysicalMaterial({
        color: 0x8cc8ff,
        transparent: true,
        opacity: 0.65,
        roughness: 0.2,
        transmission: 0.9,
        thickness: 0.5,
        emissive: 0x8cc8ff,
        emissiveIntensity: 0.4,
      })
    };
  }, []);

  const getEmojiForType = (type) => {
    if (type === 'root') return null; // No emoji for Zenith Universe
    if (type === 'dir') return '📁'; // Classic blue folder for futuristic aesthetic
    return '📄';
  };

  const pathParts = currentPath.split('/').filter(Boolean);

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'auto' }}>
      
      {/* Interactive Breadcrumb Overlay Display */}
      <div style={{
        position: 'absolute',
        top: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(10, 15, 26, 0.6)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '12px 24px',
        borderRadius: '100px',
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: '1.05rem',
        fontWeight: '600',
        letterSpacing: '0.05em',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        pointerEvents: 'auto'
      }}>
        <button 
          onClick={() => onBreadcrumbClick && onBreadcrumbClick(-1)}
          style={{
            background: 'transparent',
            border: 'none',
            color: currentPath === '/' ? '#ff857a' : 'rgba(255, 255, 255, 0.6)',
            cursor: currentPath === '/' ? 'default' : 'pointer',
            fontSize: currentPath === '/' ? '1.2rem' : '1rem',
            fontWeight: currentPath === '/' ? '800' : '600',
            transition: 'all 0.2s ease',
            padding: '2px 6px',
            borderRadius: '6px'
          }}
          onMouseEnter={(e) => { if (currentPath !== '/') { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; } }}
          onMouseLeave={(e) => { if (currentPath !== '/') { e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'; e.currentTarget.style.background = 'transparent'; } }}
        >
          🌌 Zenith Universe
        </button>
        
        {pathParts.map((part, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
            <button
              onClick={() => onBreadcrumbClick && onBreadcrumbClick(index)}
              style={{
                background: 'transparent',
                border: 'none',
                color: index === pathParts.length - 1 ? '#ff857a' : 'rgba(255, 255, 255, 0.6)',
                cursor: index === pathParts.length - 1 ? 'default' : 'pointer',
                fontSize: index === pathParts.length - 1 ? '1.2rem' : '1rem',
                fontWeight: index === pathParts.length - 1 ? '800' : '600',
                transition: 'all 0.2s ease',
                padding: '2px 6px',
                borderRadius: '6px'
              }}
              onMouseEnter={(e) => { if (index !== pathParts.length - 1) { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; } }}
              onMouseLeave={(e) => { if (index !== pathParts.length - 1) { e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'; e.currentTarget.style.background = 'transparent'; } }}
            >
              {part}
            </button>
          </div>
        ))}
      </div>

      {/* Floating Back Button for Graph Mode */}
      {currentPath !== '/' && (
        <button 
          onClick={onGoBack}
          style={{
            position: 'absolute',
            top: '130px',
            right: '24px',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(10, 15, 26, 0.6)',
            backdropFilter: 'blur(16px)',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 133, 122, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(255, 133, 122, 0.4)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(10, 15, 26, 0.6)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back Space
        </button>
      )}

      <ForceGraph3D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        backgroundColor="rgba(0,0,0,0)" // Transparent to let Zenith's particle background shine
        showNavInfo={false}
        nodeRelSize={1}
        nodeVal={node => node.val}
        nodeThreeObject={(node) => {
          const group = new THREE.Group();

          // 1. The Glass Sphere
          const mat = materials[node.type] || materials.file;
          const radius = node.val;
          const geo = new THREE.SphereGeometry(radius, 32, 32);
          const mesh = new THREE.Mesh(geo, mat);
          group.add(mesh);

          // 2. The Emoji Sprite inside/on top of the sphere (except root)
          const emoji = getEmojiForType(node.type);
          if (emoji) {
            const sprite = new SpriteText(emoji);
            sprite.textHeight = radius * 1.2; // Scale emoji based on sphere size
            sprite.material.depthTest = false; // Ensure emoji is always visible through the glass
            group.add(sprite);
          }

          // 3. The explicit Name Label below the sphere
          if (node.name) {
            const label = new SpriteText(node.name);
            label.color = 'rgba(255, 255, 255, 0.95)';
            label.fontWeight = '700';
            label.fontFace = 'Inter, -apple-system, sans-serif'; // Futuristic thick font
            label.textHeight = Math.max(3.5, radius * 0.35); // Keep readable at distance
            label.position.y = -(radius + label.textHeight * 0.8 + 2); // Position below the sphere
            label.material.depthTest = false; // Always float on top
            group.add(label);
          }

          return group;
        }}
        nodeLabel="name"
        onNodeClick={(node) => {
          if (node.type !== 'root' && onNodeClick) {
            onNodeClick(node.itemData);
          }
        }}
        // Orbiting glowing fiber-optic effects
        linkColor={() => 'rgba(138, 99, 255, 0.4)'}
        linkWidth={1.5}
        linkResolution={6}
        linkDirectionalParticles={3}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleColor={() => '#ffffff'}
      />
    </div>
  );
}
