import { EntityLink } from '@/components/EntityLink'
import { ErrorBanner } from '@/components/error/ErrorBanner'
import {
  useGetAccessRequirementsForEntity,
  useGetCurrentUserProfile,
} from '@/synapse-queries'
import { useSubmitGaasRequest } from '@/synapse-queries/gaas/useGaas'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Step,
  StepLabel,
  Stepper,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { DeleteOutline } from '@mui/icons-material'
import {
  DeclaredPurpose,
  UnifiedAccessRequest,
} from '@sage-bionetworks/synapse-types'
import { useMemo, useState } from 'react'
import { DUO_DISEASE_SPECIFIC, DUO_PURPOSES } from './gaasDisplay'
import { PolicyPreCheckStep } from './PolicyPreCheckStep'

export const WIZARD_STEPS = [
  'Datasets',
  'Project and intended data use',
  'Purpose and declarations',
  'Accessors and signing official',
  'Policy pre-check',
] as const

const DATASETS_STEP = 0
const PROJECT_STEP = 1
const PURPOSE_STEP = 2
const ACCESSORS_STEP = 3
const PRE_CHECK_STEP = 4

export type UnifiedAccessRequestWizardProps = {
  /** Entity IDs to request, e.g. from the download list or a table selection */
  initialEntityIds?: string[]
  onSubmitted: (request: UnifiedAccessRequest) => void
}

export type GaasRequestDraft = Required<
  Pick<
    UnifiedAccessRequest,
    | 'entityIds'
    | 'projectTitle'
    | 'projectLead'
    | 'institution'
    | 'intendedDataUseStatement'
    | 'signingOfficialName'
    | 'signingOfficialEmail'
  >
> & {
  declaredPurpose: Required<
    Pick<
      DeclaredPurpose,
      | 'purposeCodes'
      | 'diseaseCodes'
      | 'isCommercial'
      | 'institutionCountry'
      | 'publicationAcknowledged'
    >
  >
  /** Accessors besides the requester, who is always one */
  otherAccessorIds: string[]
}

function emptyDraft(entityIds: string[]): GaasRequestDraft {
  return {
    entityIds,
    projectTitle: '',
    projectLead: '',
    institution: '',
    intendedDataUseStatement: '',
    signingOfficialName: '',
    signingOfficialEmail: '',
    declaredPurpose: {
      purposeCodes: [],
      diseaseCodes: [],
      isCommercial: false,
      institutionCountry: '',
      publicationAcknowledged: false,
    },
    otherAccessorIds: [],
  }
}

function splitList(value: string) {
  return value
    .split(/[\s,]+/)
    .map(item => item.trim())
    .filter(item => item.length > 0)
}

function isStepComplete(step: number, draft: GaasRequestDraft) {
  switch (step) {
    case DATASETS_STEP:
      return draft.entityIds.length > 0
    case PROJECT_STEP:
      return (
        draft.projectTitle.trim() !== '' &&
        draft.projectLead.trim() !== '' &&
        draft.institution.trim() !== '' &&
        draft.intendedDataUseStatement.trim() !== ''
      )
    case PURPOSE_STEP: {
      const { purposeCodes, diseaseCodes, institutionCountry } =
        draft.declaredPurpose
      const diseaseOk =
        !purposeCodes.includes(DUO_DISEASE_SPECIFIC) || diseaseCodes.length > 0
      return (
        purposeCodes.length > 0 && diseaseOk && institutionCountry.length === 2
      )
    }
    case ACCESSORS_STEP:
      return (
        draft.signingOfficialName.trim() !== '' &&
        draft.signingOfficialEmail.trim() !== ''
      )
    default:
      return true
  }
}

/**
 * One application for every access requirement on the selected data (diagram steps 1–2):
 * the GaaS policy engine checks it, then each AMP's DAC reviews its part.
 */
export function UnifiedAccessRequestWizard(
  props: UnifiedAccessRequestWizardProps,
) {
  const { initialEntityIds = [], onSubmitted } = props
  const [activeStep, setActiveStep] = useState(DATASETS_STEP)
  const [draft, setDraft] = useState<GaasRequestDraft>(() => emptyDraft(initialEntityIds))
  const { data: currentUser } = useGetCurrentUserProfile()
  const submitMutation = useSubmitGaasRequest({ onSuccess: onSubmitted })

  const request: UnifiedAccessRequest = useMemo(() => {
    const { otherAccessorIds, ...rest } = draft
    const accessorIds = currentUser
      ? [currentUser.ownerId, ...otherAccessorIds.filter(id => id !== currentUser.ownerId)]
      : otherAccessorIds
    return { ...rest, accessorIds }
  }, [draft, currentUser])

  const update = (patch: Partial<GaasRequestDraft>) =>
    setDraft(previous => ({ ...previous, ...patch }))
  const updatePurpose = (patch: Partial<GaasRequestDraft['declaredPurpose']>) =>
    setDraft(previous => ({
      ...previous,
      declaredPurpose: { ...previous.declaredPurpose, ...patch },
    }))

  const canContinue = isStepComplete(activeStep, draft)
  const isLastStep = activeStep === PRE_CHECK_STEP

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="headline2" sx={{ mb: 1 }}>
        Request access with one application
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        One request covers every dataset you select, whichever AMP governs it.
        Each AMP&apos;s Data Access Committee decides on its own data; the
        Central Coordinator links the decisions.
      </Typography>
      <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
        {WIZARD_STEPS.map(label => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {activeStep === DATASETS_STEP && (
        <DatasetsStep
          entityIds={draft.entityIds}
          onChange={entityIds => update({ entityIds })}
        />
      )}
      {activeStep === PROJECT_STEP && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Project title"
            required
            value={draft.projectTitle}
            onChange={e => update({ projectTitle: e.target.value })}
          />
          <TextField
            label="Project lead"
            required
            value={draft.projectLead}
            onChange={e => update({ projectLead: e.target.value })}
          />
          <TextField
            label="Institution"
            required
            value={draft.institution}
            onChange={e => update({ institution: e.target.value })}
          />
          <TextField
            label="Intended data use statement"
            helperText="Published in the public Data Use Register."
            required
            multiline
            minRows={4}
            value={draft.intendedDataUseStatement}
            onChange={e => update({ intendedDataUseStatement: e.target.value })}
          />
        </Box>
      )}
      {activeStep === PURPOSE_STEP && (
        <PurposeStep purpose={draft.declaredPurpose} onChange={updatePurpose} />
      )}
      {activeStep === ACCESSORS_STEP && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body1">
            You are an accessor on this request. Add the Synapse user IDs of
            anyone else who will work with the data.
          </Typography>
          <TextField
            label="Other accessors (Synapse user IDs)"
            value={draft.otherAccessorIds.join(', ')}
            onChange={e => update({ otherAccessorIds: splitList(e.target.value) })}
          />
          <TextField
            label="Signing official"
            required
            value={draft.signingOfficialName}
            onChange={e => update({ signingOfficialName: e.target.value })}
          />
          <TextField
            label="Signing official email"
            type="email"
            required
            value={draft.signingOfficialEmail}
            onChange={e => update({ signingOfficialEmail: e.target.value })}
          />
        </Box>
      )}
      {activeStep === PRE_CHECK_STEP && <PolicyPreCheckStep request={request} />}

      <ErrorBanner error={submitMutation.error} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          variant="outlined"
          disabled={activeStep === DATASETS_STEP}
          onClick={() => setActiveStep(step => step - 1)}
        >
          Back
        </Button>
        {isLastStep ? (
          <Button
            variant="contained"
            disabled={submitMutation.isPending}
            onClick={() => submitMutation.mutate(request)}
          >
            Submit request
          </Button>
        ) : (
          <Button
            variant="contained"
            disabled={!canContinue}
            onClick={() => setActiveStep(step => step + 1)}
          >
            Next
          </Button>
        )}
      </Box>
    </Paper>
  )
}

function DatasetsStep(props: {
  entityIds: string[]
  onChange: (entityIds: string[]) => void
}) {
  const { entityIds, onChange } = props
  const [newIds, setNewIds] = useState('')
  const addIds = () => {
    const merged = Array.from(new Set([...entityIds, ...splitList(newIds)]))
    onChange(merged)
    setNewIds('')
  }
  return (
    <Box>
      {entityIds.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Add the Synapse IDs of the datasets or files you want to use.
        </Alert>
      )}
      <List dense aria-label="Selected datasets">
        {entityIds.map(entityId => (
          <ListItem
            key={entityId}
            secondaryAction={
              <IconButton
                aria-label={`Remove ${entityId}`}
                onClick={() => onChange(entityIds.filter(id => id !== entityId))}
              >
                <DeleteOutline />
              </IconButton>
            }
          >
            <ListItemText
              primary={<EntityLink entity={entityId} />}
              secondary={<EntityAccessRequirementNames entityId={entityId} />}
            />
          </ListItem>
        ))}
      </List>
      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        <TextField
          label="Add Synapse IDs"
          placeholder="syn123, syn456"
          size="small"
          value={newIds}
          onChange={e => setNewIds(e.target.value)}
        />
        <Button variant="outlined" onClick={addIds} disabled={!newIds.trim()}>
          Add
        </Button>
      </Box>
    </Box>
  )
}

function EntityAccessRequirementNames(props: { entityId: string }) {
  const { data: accessRequirements, isLoading } =
    useGetAccessRequirementsForEntity(props.entityId)
  if (isLoading) {
    return <>Loading access requirements…</>
  }
  if (!accessRequirements || accessRequirements.length === 0) {
    return <>No access requirements</>
  }
  return (
    <>
      {accessRequirements
        .map(ar => ar.name ?? `Access requirement ${ar.id}`)
        .join('; ')}
    </>
  )
}

function PurposeStep(props: {
  purpose: GaasRequestDraft['declaredPurpose']
  onChange: (patch: Partial<GaasRequestDraft['declaredPurpose']>) => void
}) {
  const { purpose, onChange } = props
  const togglePurpose = (code: string, checked: boolean) =>
    onChange({
      purposeCodes: checked
        ? [...purpose.purposeCodes, code]
        : purpose.purposeCodes.filter(c => c !== code),
    })
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body1">
        Declare your research purpose in Data Use Ontology (DUO) terms. The
        policy engine compares it with each dataset&apos;s data use terms.
      </Typography>
      <FormGroup>
        {DUO_PURPOSES.map(({ code, label }) => (
          <FormControlLabel
            key={code}
            control={
              <Checkbox
                checked={purpose.purposeCodes.includes(code)}
                onChange={e => togglePurpose(code, e.target.checked)}
              />
            }
            label={`${label}, ${code}`}
          />
        ))}
      </FormGroup>
      {purpose.purposeCodes.includes(DUO_DISEASE_SPECIFIC) && (
        <TextField
          label="Diseases studied (MONDO codes)"
          placeholder="MONDO:0004975"
          required
          value={purpose.diseaseCodes.join(', ')}
          onChange={e => onChange({ diseaseCodes: splitList(e.target.value) })}
        />
      )}
      <TextField
        label="Institution country (ISO 3166 two-letter code)"
        required
        slotProps={{ htmlInput: { maxLength: 2 } }}
        value={purpose.institutionCountry}
        onChange={e =>
          onChange({ institutionCountry: e.target.value.toUpperCase() })
        }
      />
      <FormControlLabel
        control={
          <Switch
            checked={purpose.isCommercial}
            onChange={e => onChange({ isCommercial: e.target.checked })}
          />
        }
        label="This research is for commercial use"
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={purpose.publicationAcknowledged}
            onChange={e =>
              onChange({ publicationAcknowledged: e.target.checked })
            }
          />
        }
        label="I agree to publish the results of this research"
      />
    </Box>
  )
}
