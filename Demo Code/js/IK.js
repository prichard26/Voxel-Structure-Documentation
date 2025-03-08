export class InverseKinematics {
    constructor() {}

    static projectToPlane(vector, normal) {
        normal.normalize();
        return vector.clone().sub(normal.clone().multiplyScalar(vector.clone().dot(normal)));
    }

    static alignJ0ToPlane(j0, planeNormal) {
        return this.projectToPlane(j0, planeNormal);
    }

    static constrainTargetOrientation(targetOrientation, normal) {
        normal.normalize();
        let rTarget = new THREE.Matrix3().setFromMatrix4(targetOrientation);
        let forwardVector = new THREE.Vector3(0, 0, 1).applyMatrix3(rTarget);

        let constrainedForward = this.projectToPlane(forwardVector, normal).normalize();
        let rightVector = new THREE.Vector3().crossVectors(normal, constrainedForward).normalize();
        let correctedRotationMatrix = new THREE.Matrix4().makeBasis(rightVector, new THREE.Vector3().crossVectors(rightVector, normal), normal);

        return correctedRotationMatrix;
    }

    static ik2D(x, y, d1, d2) {
        let dist = Math.sqrt(x ** 2 + y ** 2);
        if (dist > d1 + d2) return { theta1: 0, theta2: Math.PI };
        
        let theta1 = Math.atan2(y, x) - Math.acos((dist ** 2 + d1 ** 2 - d2 ** 2) / (2 * d1 * dist));
        let theta2 = Math.atan2(y - d1 * Math.sin(theta1), x - d1 * Math.cos(theta1));
        return { theta1, theta2 };
    }

    static ik3D(targetPos, originPos, d1, d2, normal, newNormal) {
        let movementVector = targetPos.clone().sub(originPos).normalize();
        let perpendicular = new THREE.Vector3().crossVectors(movementVector, newNormal).normalize();

        if (perpendicular.lengthSq() === 0) {
            console.log("⚠️ Perpendicular axis is zero! Check normal computation.");
            return { theta1: 0, theta2: Math.PI, quaternion: new THREE.Quaternion() };
        }

        let projectedTarget = targetPos.clone().sub(newNormal.clone().multiplyScalar(targetPos.clone().sub(originPos).dot(newNormal)));
        let dx = projectedTarget.clone().sub(originPos).length();
        let dz = targetPos.clone().sub(projectedTarget).dot(newNormal);
        let angles = this.ik2D(dz, dx, d1, d2);

        let fullRotation = new THREE.Quaternion();
        if (!normal.equals(newNormal)) fullRotation.setFromUnitVectors(normal.clone().normalize(), newNormal.clone().normalize());

        return {
            theta1: angles.theta1,
            theta2: angles.theta2,
            quaternion: fullRotation
        };
    }
}