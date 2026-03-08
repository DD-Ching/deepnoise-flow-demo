import InputNode from './InputNode'
import DenoiseNode from './DenoiseNode'
import SeparationNode from './SeparationNode'
import CustomModelNode from './CustomModelNode'
import SpeakerMixerNode from './SpeakerMixerNode'
import ExportNode from './ExportNode'

export const nodeTypes = {
  input: InputNode,
  denoise: DenoiseNode,
  separation: SeparationNode,
  custom_model: CustomModelNode,
  mixer: SpeakerMixerNode,
  export: ExportNode,
}
