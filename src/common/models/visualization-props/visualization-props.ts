'use strict';

import { CubeClicker } from '../clicker/clicker';
import { Stage } from '../stage/stage';
import { CubeEssence } from '../essence/cube-essence';

export interface VisualizationProps {
  clicker: CubeClicker;
  essence: CubeEssence;
  stage: Stage;
}
