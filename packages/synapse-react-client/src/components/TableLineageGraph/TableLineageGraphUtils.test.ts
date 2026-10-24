import {
  MOCK_LINEAGE_ROOT_ID,
  mockTableLineage,
} from '@/mocks/table/mockTableLineage'
import { TableLineage } from '@/synapse-queries/table/TableLineage'
import {
  formatTimeAgo,
  getChangedNodeIds,
  getLineageFlowElements,
  getLineageNodeDisplayName,
  NOT_FOUND_NODE_NAME,
  RESTRICTED_NODE_NAME,
} from './TableLineageGraphUtils'

const CLASS_NAMES = {
  node: 'node',
  root: 'root',
  unreadable: 'unreadable',
  clickable: 'clickable',
}

function getElements(changedNodeIds?: Set<string>) {
  return getLineageFlowElements(
    mockTableLineage,
    CLASS_NAMES,
    node => node.access === 'READABLE',
    node => node.id,
    changedNodeIds,
  )
}

function withNode(
  lineage: TableLineage,
  id: string,
  changes: Partial<TableLineage['nodes'][number]>,
): TableLineage {
  return {
    ...lineage,
    nodes: lineage.nodes.map(node =>
      node.id === id ? { ...node, ...changes } : node,
    ),
  }
}

describe('TableLineageGraphUtils', () => {
  describe('getLineageFlowElements', () => {
    it('creates a node for every object and an edge for every dependency', () => {
      const { nodes, edges } = getElements()

      expect(nodes.map(node => node.id)).toEqual(
        mockTableLineage.nodes.map(node => node.id),
      )
      expect(edges.map(edge => [edge.source, edge.target])).toEqual(
        mockTableLineage.edges.map(edge => [edge.sourceId, edge.dependentId]),
      )
    })

    it('places sources to the left of what is built from them', () => {
      const { nodes } = getElements()
      const x = (id: string) => nodes.find(node => node.id === id)!.position.x

      for (const edge of mockTableLineage.edges) {
        expect(x(edge.sourceId)).toBeLessThan(x(edge.dependentId))
      }
    })

    it('marks the root, unreadable and clickable nodes', () => {
      const { nodes } = getElements()
      const classesOf = (id: string) =>
        nodes.find(node => node.id === id)!.className!.split(' ')

      expect(classesOf(MOCK_LINEAGE_ROOT_ID)).toEqual([
        'node',
        'root',
        'clickable',
      ])
      expect(classesOf('syn9100009')).toEqual(['node', 'unreadable'])
      expect(classesOf('syn9100006')).toEqual(['node', 'unreadable'])
    })

    it('animates the edges into a node that is processing or just changed', () => {
      const { edges } = getElements(new Set(['syn9100005']))
      const animatedTargets = edges
        .filter(edge => edge.animated)
        .map(edge => edge.target)

      // syn9100004 is PROCESSING; syn9100005 just changed
      expect(animatedTargets).toEqual(['syn9100004', 'syn9100005'])
    })
  })

  describe('getChangedNodeIds', () => {
    it('finds the nodes whose stateChangedOn advanced or whose state changed', () => {
      let next = withNode(mockTableLineage, MOCK_LINEAGE_ROOT_ID, {
        stateChangedOn: '2026-10-20T15:10:00.000Z',
      })
      next = withNode(next, 'syn9100004', { tableState: 'AVAILABLE' })

      expect(getChangedNodeIds(mockTableLineage, next)).toEqual(
        new Set([MOCK_LINEAGE_ROOT_ID, 'syn9100004']),
      )
    })

    it('finds nothing on the first fetch or when nothing changed', () => {
      expect(getChangedNodeIds(undefined, mockTableLineage)).toEqual(new Set())
      expect(
        getChangedNodeIds(mockTableLineage, structuredClone(mockTableLineage)),
      ).toEqual(new Set())
    })
  })

  describe('formatTimeAgo', () => {
    const changedOn = '2026-10-20T15:00:00.000Z'
    const at = (seconds: number) => Date.parse(changedOn) + seconds * 1000

    it.each([
      [0, '0s ago'],
      [4.4, '4s ago'],
      [59, '59s ago'],
      [60, '1m ago'],
      [3599, '59m ago'],
      [3600, '1h ago'],
      [86400 * 2, '2d ago'],
      // a clock slightly behind the server's
      [-2, '0s ago'],
    ])('%ss later is "%s"', (seconds, expected) => {
      expect(formatTimeAgo(changedOn, at(seconds))).toBe(expected)
    })
  })

  describe('getLineageNodeDisplayName', () => {
    it('names readable, restricted and deleted nodes', () => {
      expect(getLineageNodeDisplayName(mockTableLineage.nodes[0])).toBe(
        'Participants with samples',
      )
      expect(
        getLineageNodeDisplayName({ id: 'syn1', access: 'RESTRICTED' }),
      ).toBe(RESTRICTED_NODE_NAME)
      expect(
        getLineageNodeDisplayName({ id: 'syn1', access: 'NOT_FOUND' }),
      ).toBe(NOT_FOUND_NODE_NAME)
    })
  })
})
