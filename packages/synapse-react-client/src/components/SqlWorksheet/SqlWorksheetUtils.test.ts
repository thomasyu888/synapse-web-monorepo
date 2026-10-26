import {
  combinesTables,
  getDefaultWorksheetSql,
  getReferencedTableIds,
  getWorksheetErrorHint,
  JOIN_COLUMN_HINT,
  NO_TABLE_MESSAGE,
  normalizeSql,
  planWorksheetQuery,
} from './SqlWorksheetUtils'

describe('SqlWorksheetUtils', () => {
  describe('getReferencedTableIds', () => {
    it.each([
      ['SELECT * FROM syn123', ['syn123']],
      ['select a from SYN123.4 where b = 1', ['syn123.4']],
      [
        'SELECT * FROM syn1 a JOIN syn2 b ON a.id = b.id LEFT JOIN syn3 c ON a.id = c.id',
        ['syn1', 'syn2', 'syn3'],
      ],
      ['SELECT * FROM syn1 UNION SELECT * FROM syn2', ['syn1', 'syn2']],
      ['SELECT * FROM syn1 UNION SELECT * FROM syn1', ['syn1']],
      ["SELECT * FROM syn1 WHERE note = 'from syn9'", ['syn1']],
      ['SELECT * FROM syn1 -- join syn9', ['syn1']],
      ['SELECT * FROM syn1 /* from syn9 */', ['syn1']],
      ['SELECT 1', []],
    ])('%s', (sql, expected) => {
      expect(getReferencedTableIds(sql)).toEqual(expected)
    })
  })

  describe('combinesTables', () => {
    it.each([
      ['SELECT * FROM syn1', false],
      ['SELECT * FROM syn1 WHERE joined = true', false],
      ["SELECT * FROM syn1 WHERE note = 'union of things'", false],
      ['SELECT * FROM syn1 JOIN syn2 ON syn1.id = syn2.id', true],
      ['SELECT * FROM syn1 UNION SELECT * FROM syn1', true],
    ])('%s', (sql, expected) => {
      expect(combinesTables(sql)).toBe(expected)
    })
  })

  describe('planWorksheetQuery', () => {
    it('runs a query on one table directly', () => {
      expect(planWorksheetQuery('SELECT id, name FROM syn123.4')).toEqual({
        kind: 'direct',
        entityId: 'syn123',
        versionNumber: 4,
      })
    })

    it('runs a JOIN as a materialized view', () => {
      expect(
        planWorksheetQuery(
          'SELECT * FROM syn1 a JOIN syn2 b ON a.id = b.participant',
        ),
      ).toEqual({ kind: 'combined', sourceIds: ['syn1', 'syn2'] })
    })

    it('runs a UNION of one table as a materialized view', () => {
      expect(
        planWorksheetQuery('SELECT a FROM syn1 UNION SELECT b FROM syn1'),
      ).toEqual({ kind: 'combined', sourceIds: ['syn1'] })
    })

    it('rejects SQL that names no table', () => {
      expect(planWorksheetQuery('SELECT 1')).toEqual({
        kind: 'invalid',
        reason: NO_TABLE_MESSAGE,
      })
    })
  })

  describe('getDefaultWorksheetSql', () => {
    it('selects everything from the given entity', () => {
      expect(getDefaultWorksheetSql('syn42')).toBe('SELECT * FROM syn42')
    })

    it('is empty without an entity', () => {
      expect(getDefaultWorksheetSql()).toBe('')
    })
  })

  describe('getWorksheetErrorHint', () => {
    it.each([
      ["Unknown column 's.tissue' in 'field list'", true, JOIN_COLUMN_HINT],
      ['cohort is a reserved word', true, JOIN_COLUMN_HINT],
      ["Unknown column 'tissue'", false, undefined],
      ['You lack READ access to the requested entity.', true, undefined],
    ])('%s (combines tables: %s)', (reason, combinesTables, expected) => {
      expect(getWorksheetErrorHint(reason, combinesTables)).toBe(expected)
    })
  })

  describe('normalizeSql', () => {
    it('ignores layout and keyword case', () => {
      expect(
        normalizeSql(
          'SELECT a.id\n  FROM syn1 a\n\tJOIN syn2 b ON a.id = b.id  ',
        ),
      ).toBe(normalizeSql('select a.id from SYN1 a join syn2 b on a.id = b.id'))
    })

    it('keeps string literals as written', () => {
      expect(
        normalizeSql("SELECT * FROM syn1 WHERE tissue = 'Blood  Cells'"),
      ).toBe("select * from syn1 where tissue = 'Blood  Cells'")
      expect(
        normalizeSql("SELECT * FROM syn1 WHERE tissue = 'Blood'"),
      ).not.toBe(normalizeSql("SELECT * FROM syn1 WHERE tissue = 'blood'"))
    })
  })
})
